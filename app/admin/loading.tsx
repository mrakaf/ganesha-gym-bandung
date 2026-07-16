export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="relative w-14 h-14 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-500 font-poppins text-sm animate-pulse">Memuat halaman...</p>
      </div>
    </div>
  )
}
