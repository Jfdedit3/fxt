export default function LoadingProfile() {
  return <main className="profileShell" aria-busy="true" aria-label="Loading profile">
    <p className="profileLoadingStatus" role="status">Loading profile…</p>
    <div className="profileSkeleton" aria-hidden="true"><div className="profileBanner profileBannerFallback" /><div className="profileSummary"><div className="profileAvatar profileAvatarFallback" /><div className="skeletonLine" /><div className="skeletonLine short" /></div></div>
  </main>;
}
