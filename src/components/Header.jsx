export default function Header({ version }) {
  return (
    <header className="w-full max-w-6xl flex justify-between items-center py-5 mb-4 border-b border-gray-800">
      <div className="flex items-center gap-2">
        <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xl">C</div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 text-transparent bg-clip-text">
          Cropyfier
        </h1>
      </div>
      <div className='text-gray-600 text-xs bg-gray-800 px-2 py-1 rounded-full'>{version}</div>
    </header>
  )
}