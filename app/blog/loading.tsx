import styles from './loading.module.scss';

const BlogLoading = () => (
  <div className={styles.loadingContainer}>
    <section className={styles.header}>
      <div className="container">
        <div className={styles.titleSkeleton} />
        <div className={styles.subtitleSkeleton} />
      </div>
    </section>

    <section className={styles.content}>
      <div className="container">
        <div className={styles.postsList}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.cardSkeleton}>
              <div className={styles.imageSkeleton} />
              <div className={styles.contentSkeleton}>
                <div className={styles.titleSkeleton} />
                <div className={styles.descriptionSkeleton} />
                <div className={styles.descriptionSkeleton} />
                <div className={styles.metaSkeleton} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </div>
);

export default BlogLoading;
