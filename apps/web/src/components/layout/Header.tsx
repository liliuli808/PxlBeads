import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between">
      <Link to="/" className="text-lg font-bold">PxlBeads</Link>
      <nav className="flex gap-4">
        <Link to="/" className="hover:underline">上传</Link>
        <Link to="/editor" className="hover:underline">编辑</Link>
        <Link to="/export" className="hover:underline">导出</Link>
        <Link to="/helper" className="hover:underline">拼装辅助</Link>
      </nav>
    </header>
  );
}
