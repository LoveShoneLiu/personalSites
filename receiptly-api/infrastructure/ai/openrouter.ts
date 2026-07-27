/** 文件职责：调用 OpenRouter 视觉模型，并把不可信模型输出转换为小票候选数据。 */
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';
import { ReceiptCandidate, ReceiptCandidateLine } from '@/receiptly-api/contracts/receipt-candidate';
import { normalizeReceiptQuantity } from '@/receiptly-api/domain/quantity';
import { resolveDeclaredTotalCents } from './receipt-total';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// 主动超时必须早于 Vercel Function 上限，预留时间生成统一错误响应。
const OCR_REQUEST_TIMEOUT_MS = 50_000;
const defaultModel = 'qwen/qwen3-vl-32b-instruct';

export type ReceiptExtraction = ReceiptCandidate;

type RawExtractionLine = Omit<ReceiptCandidateLine, 'sortOrder' | 'source' | 'included'>;

type RawExtraction = Omit<ReceiptExtraction, 'lines'> & {
  subtotalExcludingTaxCents: number | null;
  taxCents: number | null;
  amountPaidCents: number | null;
  lines: RawExtractionLine[];
};

type OcrFailureStage =
  | 'request_timeout'
  | 'request_failed'
  | 'upstream_http_error'
  | 'upstream_response_invalid'
  | 'upstream_result_missing'
  | 'model_result_invalid_json'
  | 'model_result_schema_mismatch';

/**
 * 记录 OCR 上游故障的可观测元数据。
 * 禁止传入或记录图片、请求正文、认证凭据及模型返回正文。
 */
const logOcrFailure = ({
  stage,
  model,
  startedAt,
  response,
  error,
  resultLength,
}: {
  stage: OcrFailureStage;
  model: string;
  startedAt: number;
  response?: Response;
  error?: unknown;
  resultLength?: number;
}) => {
  // 仅记录定位上游故障所需的非敏感技术信息。
  // eslint-disable-next-line no-console
  console.error('Receiptly OCR provider failure.', {
    stage,
    model,
    durationMs: Date.now() - startedAt,
    upstreamStatus: response?.status,
    upstreamStatusText: response?.statusText || undefined,
    upstreamContentType: response?.headers.get('content-type') ?? undefined,
    upstreamContentLength: response?.headers.get('content-length') ?? undefined,
    upstreamRequestId: response?.headers.get('x-request-id')
      ?? response?.headers.get('x-openrouter-request-id')
      ?? undefined,
    upstreamCfRay: response?.headers.get('cf-ray') ?? undefined,
    errorName: error instanceof Error ? error.name : undefined,
    resultLength,
  });
};

/**
 * 判断外部请求是否因超时或主动中止而失败。
 * Node.js 运行时抛出的 TimeoutError 不保证是当前 realm 的 DOMException，
 * 因此需要同时根据异常名称判断，避免把可识别的超时错误误报为 500。
 */
const isRequestTimeout = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const { name } = error as { name?: unknown };
  return name === 'TimeoutError' || name === 'AbortError';
};

// Provider 侧的 Schema 约束只能提高一致性；外部模型输出仍属于不可信输入，
// 服务端必须继续执行运行时校验。
const extractionSchema = {
  name: 'receipt_extraction',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'storeName',
      'receiptNumber',
      'purchasedOn',
      'purchasedAtLocal',
      'currency',
      'declaredTotalCents',
      'subtotalExcludingTaxCents',
      'taxCents',
      'amountPaidCents',
      'lines',
    ],
    properties: {
      storeName: { type: ['string', 'null'] },
      receiptNumber: {
        type: ['string', 'null'],
        description: 'Receipt, transaction, or EPOS reference printed on the receipt. Null when unavailable.',
      },
      purchasedOn: {
        type: ['string', 'null'],
        description: 'Purchase date in YYYY-MM-DD. Use null when absent or ambiguous.',
      },
      purchasedAtLocal: {
        type: ['string', 'null'],
        description: 'Local receipt date and time in YYYY-MM-DDTHH:MM, without a timezone. Null when no time is printed.',
      },
      currency: {
        type: ['string', 'null'],
        description: 'Three-letter ISO 4217 currency code, or null when unknown.',
      },
      declaredTotalCents: {
        type: ['integer', 'null'],
        description: 'Final tax-inclusive receipt total in minor units. Never use a subtotal or TOTAL EXCL GST.',
      },
      subtotalExcludingTaxCents: {
        type: ['integer', 'null'],
        description: 'Printed subtotal before GST/tax, such as TOTAL EXCL GST, in minor units.',
      },
      taxCents: {
        type: ['integer', 'null'],
        description: 'Printed GST or tax amount in minor units.',
      },
      amountPaidCents: {
        type: ['integer', 'null'],
        description: 'Actual final card/debit charge or purchase amount in minor units; never cash tendered.',
      },
      lines: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['rawText', 'productName', 'quantity', 'unit', 'unitPriceCents', 'unitPriceBasis', 'linePriceCents', 'confidence'],
          properties: {
            rawText: { type: ['string', 'null'] },
            productName: { type: ['string', 'null'] },
            quantity: { type: ['string', 'null'] },
            unit: { type: ['string', 'null'] },
            unitPriceCents: { type: ['integer', 'null'] },
            unitPriceBasis: { type: ['string', 'null'] },
            linePriceCents: { type: ['integer', 'null'] },
            confidence: { type: ['number', 'null'] },
          },
        },
      },
    },
  },
};

const isRawExtraction = (value: unknown): value is RawExtraction => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return Array.isArray(result.lines)
    && (typeof result.storeName === 'string' || result.storeName === null)
    && (typeof result.receiptNumber === 'string' || result.receiptNumber === null)
    && (typeof result.purchasedOn === 'string' || result.purchasedOn === null)
    && (typeof result.purchasedAtLocal === 'string' || result.purchasedAtLocal === null)
    && (typeof result.currency === 'string' || result.currency === null)
    && (Number.isInteger(result.declaredTotalCents) || result.declaredTotalCents === null)
    && (Number.isInteger(result.subtotalExcludingTaxCents) || result.subtotalExcludingTaxCents === null)
    && (Number.isInteger(result.taxCents) || result.taxCents === null)
    && (Number.isInteger(result.amountPaidCents) || result.amountPaidCents === null)
    && result.lines.every((line) => {
      if (!line || typeof line !== 'object' || Array.isArray(line)) return false;
      const candidate = line as Record<string, unknown>;
      return (typeof candidate.rawText === 'string' || candidate.rawText === null)
        && (typeof candidate.productName === 'string' || candidate.productName === null)
        && (typeof candidate.quantity === 'string' || candidate.quantity === null)
        && (typeof candidate.unit === 'string' || candidate.unit === null)
        && (Number.isInteger(candidate.unitPriceCents) || candidate.unitPriceCents === null)
        && (typeof candidate.unitPriceBasis === 'string' || candidate.unitPriceBasis === null)
        && (Number.isInteger(candidate.linePriceCents) || candidate.linePriceCents === null)
        && (typeof candidate.confidence === 'number' || candidate.confidence === null);
    });
};

const candidateLine = (line: RawExtractionLine, sortOrder: number): ReceiptCandidateLine => {
  const numericQuantity = line.quantity === null ? null : Number(line.quantity);
  // 当模型把行总价重复识别成单价时，使用数量和行总价反推可以纠正该结果。
  const calculatedUnitPrice = numericQuantity && numericQuantity > 0 && line.linePriceCents !== null
    ? Math.round(line.linePriceCents / numericQuantity)
    : line.unitPriceCents;
  return {
    sortOrder,
    rawText: line.rawText,
    productName: line.productName,
    quantity: normalizeReceiptQuantity(line.quantity),
    unit: line.unit,
    unitPriceCents: calculatedUnitPrice,
    unitPriceBasis: line.unitPriceBasis,
    linePriceCents: line.linePriceCents,
    confidence: line.confidence,
    source: 'ai',
    included: true,
  };
};

const candidateFromRawExtraction = (raw: RawExtraction): ReceiptExtraction => {
  const {
    subtotalExcludingTaxCents,
    taxCents,
    amountPaidCents,
    ...candidate
  } = raw;
  return {
    ...candidate,
    declaredTotalCents: resolveDeclaredTotalCents({
      declaredTotalCents: raw.declaredTotalCents,
      subtotalExcludingTaxCents,
      taxCents,
      amountPaidCents,
    }),
    lines: raw.lines.map(candidateLine),
  };
};

/**
 * 将一张小票图片转换为内部审核候选数据。
 * 原始图片和完整 OCR 文本仅存在于本次请求中，本集成不会持久化这些内容。
 */
export const extractReceiptFromImage = async (
  image: Uint8Array,
  mimeType: 'image/jpeg' | 'image/png',
) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new ReceiptlyError(503, 'OCR_CONFIGURATION_ERROR', 'Receipt image recognition is not configured.');
  }

  const model = process.env.RECEIPTLY_OCR_MODEL ?? defaultModel;
  const startedAt = Date.now();
  const imageDataUrl = `data:${mimeType};base64,${Buffer.from(image).toString('base64')}`;
  let response: Response;
  try {
    response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      signal: AbortSignal.timeout(OCR_REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        stream: false,
        provider: { require_parameters: true },
        response_format: { type: 'json_schema', json_schema: extractionSchema },
        messages: [{
          role: 'system',
          content: [
            'Extract one retail receipt into the schema exactly.',
            'Return only purchased goods as lines; exclude subtotal, total, tax, payment, loyalty, cashier, change and other non-item lines.',
            'declaredTotalCents is always the final tax-inclusive amount owed or charged.',
            'Never use TOTAL EXCL GST, subtotal before tax, net amount, GST amount, tax amount, cash tendered, or change as declaredTotalCents.',
            'Capture TOTAL EXCL GST in subtotalExcludingTaxCents and GST/tax in taxCents.',
            'Capture the final electronic PURCHASE, PURC, DEBIT, CARD CHARGE, or amount paid in amountPaidCents.',
            'For cash, amountPaidCents is the final sale total, not cash received before change.',
            'When a receipt shows TOTAL EXCL GST 227.68, GST 34.15, and TOTAL or PURC 261.83, declaredTotalCents and amountPaidCents must be 26183.',
            'Preserve every printed amount and sign.',
            'All monetary fields ending in Cents use minor currency units.',
            'unitPriceCents is the per-unit price in minor units.',
            'Split quantity and unit instead of combining them in one string.',
            'quantity must be a decimal string preserving printed precision, for example "0.860"; use null when unreadable.',
            'purchasedOn must be YYYY-MM-DD and purchasedAtLocal must be YYYY-MM-DDTHH:MM without timezone.',
            'Never use 0 for unreadable monetary values; 0 is allowed only for an explicitly free item or zero amount.',
            'Only set receiptNumber if explicitly labelled as a receipt or transaction number; never use terminal, EFTPOS, card, cashier, order, authorisation, tax-invoice, or barcode identifiers.',
            'Use null for any unreadable or uncertain field.',
            'confidence is 0 to 1 when estimated, otherwise null.',
            'Check that item prices reconcile to the final tax-inclusive receipt total when possible.',
          ].join(' '),
        }, {
          role: 'user',
          content: [
            { type: 'text', text: 'Read this receipt and return the required structured data.' },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        }],
      }),
    });
  } catch (error) {
    if (isRequestTimeout(error)) {
      logOcrFailure({
        stage: 'request_timeout',
        model,
        startedAt,
        error,
      });
      throw new ReceiptlyError(504, 'OCR_PROVIDER_ERROR', 'Receipt recognition timed out. Please try again.');
    }
    logOcrFailure({
      stage: 'request_failed',
      model,
      startedAt,
      error,
    });
    throw new ReceiptlyError(502, 'OCR_PROVIDER_ERROR', 'Receipt image recognition is temporarily unavailable.');
  }

  if (!response.ok) {
    logOcrFailure({
      stage: 'upstream_http_error',
      model,
      startedAt,
      response,
    });
    throw new ReceiptlyError(502, 'OCR_PROVIDER_ERROR', 'Receipt image recognition failed.');
  }

  let payload: { choices?: Array<{ message?: { content?: string } }> };
  try {
    payload = await response.json() as typeof payload;
  } catch (error) {
    logOcrFailure({
      stage: 'upstream_response_invalid',
      model,
      startedAt,
      response,
      error,
    });
    throw new ReceiptlyError(502, 'OCR_RESULT_INVALID', 'Receipt image recognition returned an invalid response.');
  }
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    logOcrFailure({
      stage: 'upstream_result_missing',
      model,
      startedAt,
      response,
    });
    throw new ReceiptlyError(502, 'OCR_PROVIDER_ERROR', 'Receipt image recognition returned no result.');
  }

  let extraction: unknown;
  try {
    extraction = JSON.parse(content);
  } catch (error) {
    logOcrFailure({
      stage: 'model_result_invalid_json',
      model,
      startedAt,
      response,
      error,
      resultLength: content.length,
    });
    throw new ReceiptlyError(502, 'OCR_RESULT_INVALID', 'Receipt image recognition returned an invalid result.');
  }
  if (!isRawExtraction(extraction)) {
    logOcrFailure({
      stage: 'model_result_schema_mismatch',
      model,
      startedAt,
      response,
      resultLength: content.length,
    });
    throw new ReceiptlyError(502, 'OCR_RESULT_INVALID', 'Receipt image recognition returned an invalid result.');
  }
  return {
    extraction: candidateFromRawExtraction(extraction),
    model,
  };
};
