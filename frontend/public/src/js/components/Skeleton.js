// Skeleton loader utility.
// Usage: showSkeleton(containerEl, rows) — fills container with animated placeholder rows.
// The caller replaces the content when real data arrives (e.g. via DataTable.setData or innerHTML).

export function showSkeleton(container, rows = 6) {
  container.innerHTML = Array.from({ length: rows }, () => `
    <div class="skeleton-row">
      <div class="skeleton-cell w-40"></div>
      <div class="skeleton-cell w-24"></div>
      <div class="skeleton-cell w-16"></div>
    </div>`).join('')
}
