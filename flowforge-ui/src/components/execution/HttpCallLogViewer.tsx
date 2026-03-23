import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Globe, Clock, CheckCircle, XCircle } from 'lucide-react';
import { HttpCallLog } from '../../types';

interface Props {
  log: HttpCallLog;
}

export default function HttpCallLogViewer({ log }: Props) {
  const [showRequest, setShowRequest] = useState(false);
  const [showResponse, setShowResponse] = useState(true);
  const [showReqHeaders, setShowReqHeaders] = useState(false);
  const [showResHeaders, setShowResHeaders] = useState(false);

  const statusColor = log.responseStatus >= 200 && log.responseStatus < 300
    ? 'text-green-600 bg-green-50'
    : log.responseStatus >= 400
    ? 'text-red-600 bg-red-50'
    : 'text-yellow-600 bg-yellow-50';

  const tryFormatJson = (str: string) => {
    try { return JSON.stringify(JSON.parse(str), null, 2); } catch { return str; }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <Globe size={14} className="text-gray-400" />
        <span className={`font-mono font-semibold text-xs px-1.5 py-0.5 rounded ${
          log.method === 'GET' ? 'bg-blue-100 text-blue-700' :
          log.method === 'POST' ? 'bg-green-100 text-green-700' :
          log.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
          log.method === 'DELETE' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-700'
        }`}>{log.method}</span>
        <span className="font-mono text-gray-700 truncate flex-1 text-xs">{log.url}</span>
        <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${statusColor}`}>
          {log.responseStatus || '—'}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Clock size={12} />{log.durationMs}ms
        </span>
        {log.success
          ? <CheckCircle size={14} className="text-green-500" />
          : <XCircle size={14} className="text-red-500" />}
      </div>

      {/* Error message if any */}
      {log.errorMessage && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-red-700 text-xs">
          {log.errorMessage}
        </div>
      )}

      {/* Request section */}
      <div className="border-b border-gray-100">
        <button
          onClick={() => setShowRequest(!showRequest)}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 text-left"
        >
          {showRequest ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          REQUEST
        </button>
        {showRequest && (
          <div className="px-4 pb-3 space-y-2">
            {/* Request headers */}
            {log.requestHeaders && Object.keys(log.requestHeaders).length > 0 && (
              <div>
                <button
                  onClick={() => setShowReqHeaders(!showReqHeaders)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-1"
                >
                  {showReqHeaders ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                  Headers ({Object.keys(log.requestHeaders).length})
                </button>
                {showReqHeaders && (
                  <div className="bg-gray-50 rounded p-2 font-mono text-xs space-y-0.5">
                    {Object.entries(log.requestHeaders).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-blue-600 shrink-0">{k}:</span>
                        <span className="text-gray-700 break-all">{
                          k.toLowerCase().includes('authorization') || k.toLowerCase().includes('secret')
                            ? '••••••••' : v
                        }</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Request body */}
            {log.requestBody && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Body</div>
                <pre className="bg-gray-900 text-green-300 rounded p-3 text-xs overflow-auto max-h-48 font-mono">
                  {tryFormatJson(log.requestBody)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Response section */}
      <div>
        <button
          onClick={() => setShowResponse(!showResponse)}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 text-left"
        >
          {showResponse ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          RESPONSE
          <span className={`ml-auto text-xs font-bold ${statusColor} px-1.5 py-0.5 rounded`}>
            {log.responseStatus}
          </span>
        </button>
        {showResponse && (
          <div className="px-4 pb-3 space-y-2">
            {/* Response headers */}
            {log.responseHeaders && Object.keys(log.responseHeaders).length > 0 && (
              <div>
                <button
                  onClick={() => setShowResHeaders(!showResHeaders)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-1"
                >
                  {showResHeaders ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                  Headers ({Object.keys(log.responseHeaders).length})
                </button>
                {showResHeaders && (
                  <div className="bg-gray-50 rounded p-2 font-mono text-xs space-y-0.5">
                    {Object.entries(log.responseHeaders).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-blue-600 shrink-0">{k}:</span>
                        <span className="text-gray-700 break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Response body */}
            {log.responseBody && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Body</div>
                <pre className="bg-gray-900 text-green-300 rounded p-3 text-xs overflow-auto max-h-64 font-mono">
                  {tryFormatJson(log.responseBody)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
