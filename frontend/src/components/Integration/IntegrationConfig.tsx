interface Props {
  onClose: () => void;
}

export default function IntegrationConfig({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-bold text-white">연동 설정</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-xs text-gray-500">
            연동 서비스는 <code className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">backend/.env</code> 파일에 설정합니다.
          </p>

          {/* GitHub */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🐙</span>
              <h3 className="text-sm font-semibold text-white">GitHub</h3>
            </div>
            <div className="space-y-2 text-[11px] text-gray-400">
              <div className="font-mono bg-gray-900 rounded-lg px-3 py-2 text-gray-300">
                GITHUB_TOKEN=ghp_your_token<br />
                GITHUB_REPO=owner/repository
              </div>
              <p>• GitHub Settings → Developer settings → Personal access tokens → Classic</p>
              <p>• 권한: <code className="text-gray-300">repo</code></p>
            </div>
          </div>

          {/* Notion */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📔</span>
              <h3 className="text-sm font-semibold text-white">Notion</h3>
            </div>
            <div className="space-y-2 text-[11px] text-gray-400">
              <div className="font-mono bg-gray-900 rounded-lg px-3 py-2 text-gray-300">
                NOTION_TOKEN=secret_your_token<br />
                NOTION_PAGE_ID=your_page_id
              </div>
              <p>• notion.so/my-integrations → New integration → Internal</p>
              <p>• 페이지 오른쪽 상단 ··· → Connections → 연동 추가</p>
              <p>• NOTION_PAGE_ID: 페이지 URL의 32자리 ID</p>
            </div>
          </div>

          <p className="text-[10px] text-gray-600 text-center">설정 후 백엔드 서버를 재시작하세요</p>
        </div>
      </div>
    </div>
  );
}
