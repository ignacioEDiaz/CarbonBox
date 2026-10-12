export function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8" role="status" aria-label="Cargando">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-[#9bd9b8]" />
    </div>
  );
}
