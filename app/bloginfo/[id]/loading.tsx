import styles from "./loading.module.scss";

export default function BlogInfoLoading() {
  return (
    <div className={styles.loadingContainer}>
      <div className="container">
        <div className={styles.backLinkSkeleton}></div>

        <article className={styles.article}>
          <header className={styles.header}>
            <div className={styles.featuredImageSkeleton}></div>

            <div className={styles.headerContent}>
              <div className={styles.titleSkeleton}></div>
              <div className={styles.titleSkeleton} style={{ width: "80%" }}></div>
              
              <div className={styles.descriptionSkeleton}></div>
              <div className={styles.descriptionSkeleton} style={{ width: "90%" }}></div>

              <div className={styles.metaSkeleton}>
                <div className={styles.dateSkeleton}></div>
                <div className={styles.tagsSkeleton}>
                  <div className={styles.tagSkeleton}></div>
                  <div className={styles.tagSkeleton}></div>
                  <div className={styles.tagSkeleton}></div>
                </div>
              </div>
            </div>
          </header>

          <div className={styles.contentSkeleton}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className={styles.paragraphSkeleton}></div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

