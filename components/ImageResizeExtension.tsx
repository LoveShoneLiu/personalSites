import Image from '@tiptap/extension-image';
// eslint-disable-next-line import/no-extraneous-dependencies
import { NodeSelection } from '@tiptap/pm/state';

export const ImageResize = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px;`,
          };
        },
        parseHTML: (element) => {
          const width = element.getAttribute('width') || element.style.width;
          if (width) {
            const match = width.match(/(\d+)/);
            return match ? parseInt(match[1], 10) : null;
          }
          return null;
        },
      },
      height: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.height) {
            return {};
          }
          return {
            height: attributes.height,
            style: `height: ${attributes.height}px;`,
          };
        },
        parseHTML: (element) => {
          const height = element.getAttribute('height') || element.style.height;
          if (height) {
            const match = height.match(/(\d+)/);
            return match ? parseInt(match[1], 10) : null;
          }
          return null;
        },
      },
    };
  },

  addNodeView() {
    return ({
      node, view, getPos, HTMLAttributes,
    }) => {
      const dom = document.createElement('div');
      dom.className = 'image-resize-wrapper';

      const img = document.createElement('img');
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (key !== 'width' && key !== 'height') {
          img.setAttribute(key, value as string);
        }
      });

      // 设置图片尺寸
      img.style.maxWidth = '100%';
      img.style.cursor = 'pointer';
      img.style.display = 'block';

      if (node.attrs.width) {
        img.style.width = `${node.attrs.width}px`;
      }
      if (node.attrs.height) {
        img.style.height = `${node.attrs.height}px`;
      } else {
        // 如果没有设置高度，保持自动高度
        img.style.height = 'auto';
      }

      // 创建调整大小的手柄
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'image-resize-handle';
      resizeHandle.innerHTML = '↘';

      dom.className = 'image-resize-wrapper';

      dom.appendChild(img);
      dom.appendChild(resizeHandle);

      // 拖拽调整大小
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;
      let startHeight = 0;
      let aspectRatio = 0;

      const handleResize = (e: MouseEvent) => {
        if (!isResizing) return;

        const deltaX = e.clientX - startX;
        const newWidth = Math.max(50, Math.min(startWidth + deltaX, dom.parentElement?.clientWidth || Infinity));
        const newHeight = newWidth / aspectRatio;

        img.style.width = `${newWidth}px`;
        img.style.height = `${newHeight}px`;
      };

      const stopResize = () => {
        if (!isResizing) return;
        isResizing = false;

        const finalWidth = img.offsetWidth;
        const finalHeight = img.offsetHeight;

        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // 更新节点属性
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (pos !== null && pos !== undefined) {
          const { tr } = view.state;
          const selection = NodeSelection.create(tr.doc, pos);
          tr.setSelection(selection);
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            width: finalWidth,
            height: finalHeight,
          });
          view.dispatch(tr);
        }

        resizeHandle.style.opacity = '0';
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
      };

      // 鼠标悬停显示调整手柄
      const showHandle = () => {
        resizeHandle.style.opacity = '1';
      };

      const hideHandle = () => {
        if (!isResizing) {
          resizeHandle.style.opacity = '0';
        }
      };

      dom.addEventListener('mouseenter', showHandle);
      dom.addEventListener('mouseleave', hideHandle);

      const startResize = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startWidth = img.offsetWidth;
        startHeight = img.offsetHeight;
        aspectRatio = startWidth / startHeight;

        resizeHandle.style.opacity = '1';
        document.body.style.cursor = 'nwse-resize';
        document.body.style.userSelect = 'none';

        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
      };

      resizeHandle.addEventListener('mousedown', startResize);

      return {
        dom,
        contentDOM: null,
      };
    };
  },
});
