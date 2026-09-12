import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { CorporateAssetItem } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface AssetManagerViewProps {
  assets: CorporateAssetItem[];
  onInsertAssetToReport: (asset: CorporateAssetItem) => void;
}

export const AssetManagerView: React.FC<AssetManagerViewProps> = ({
  assets,
  onInsertAssetToReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUsed, setFilterUsed] = useState<'All' | 'Used' | 'Unused'>('All');
  const [selectedAsset, setSelectedAsset] = useState<CorporateAssetItem | null>(assets[0] || null);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.sourceDocument.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUsed =
      filterUsed === 'All' ||
      (filterUsed === 'Used' && asset.usedInReport) ||
      (filterUsed === 'Unused' && !asset.usedInReport);

    return matchesSearch && matchesUsed;
  });

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#233145] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              Corporate Visual Asset & High-Res Diagram Repository
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Diagrams, GIS pit bathymetry maps, and heavy machinery telemetry captures extracted automatically by local OCR & vision parsers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
            Assets Ingested: <strong className="text-blue-400">{assets.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#111722] border border-[#1e2a3b] p-3 rounded-md text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets by description, source or tags..."
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-xs"
          />
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span className="text-slate-400 text-[11px]">Usage State:</span>
          {(['All', 'Used', 'Unused'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterUsed(mode)}
              className={`px-2.5 py-1 rounded text-[11px] transition cursor-pointer ${
                filterUsed === mode
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout: Assets Grid + Asset Inspector */}
      <div className="flex-1 flex gap-5 overflow-hidden">
        {/* Assets Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 pr-1">
          {filteredAssets.map((asset) => {
            const isSelected = selectedAsset?.id === asset.id;
            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={`bg-[#111722] border rounded-md overflow-hidden flex flex-col transition cursor-pointer ${
                  isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-[#1e2a3b] hover:border-slate-700'
                }`}
              >
                {/* Visual Thumbnail */}
                <div className="h-40 bg-[#0d121b] flex items-center justify-center overflow-hidden border-b border-[#1c2636] relative group">
                  <img
                    src={asset.thumbnailUrl}
                    alt={asset.description}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    <StatusBadge
                      status={asset.usedInReport ? 'In Report' : 'Unused'}
                      variant={asset.usedInReport ? 'emerald' : 'slate'}
                      size="sm"
                    />
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded font-mono text-[10px] text-slate-300">
                    {typeof asset.dimensions === 'object' && asset.dimensions
                      ? `${(asset.dimensions as any).width} × ${(asset.dimensions as any).height}`
                      : String(asset.dimensions || '')}
                  </div>
                </div>

                {/* Metadata */}
                <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="font-semibold text-slate-200 text-xs truncate font-mono">
                      {asset.filename}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 font-sans">
                      {asset.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="truncate max-w-[140px]">{asset.sourceDocument}</span>
                    <span className="text-blue-400">Pg. {asset.page}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Asset Inspector */}
        {selectedAsset && (
          <div className="w-[380px] bg-[#111722] border border-[#1e2a3b] rounded-md overflow-hidden flex flex-col shrink-0">
            <div className="p-4 bg-[#141d2b] border-b border-[#1e2a3b] flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono truncate max-w-[240px]">
                {selectedAsset.filename}
              </h3>
              <StatusBadge
                status={selectedAsset.usedInReport ? 'Inserted' : 'Available'}
                variant={selectedAsset.usedInReport ? 'emerald' : 'slate'}
                size="sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Large Image Preview */}
              <div className="rounded overflow-hidden border border-slate-700 bg-black max-h-52 flex items-center justify-center">
                <img
                  src={selectedAsset.thumbnailUrl}
                  alt={selectedAsset.description}
                  className="w-full h-auto object-contain"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Contextual Caption</div>
                <div className="p-2.5 bg-[#141b27] border border-slate-800 rounded text-slate-200 text-xs leading-relaxed font-sans">
                  {selectedAsset.description}
                </div>
              </div>

              {/* Attributes */}
              <div className="bg-[#141b27] border border-slate-800 rounded p-3 font-mono text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Source Document:</span>
                  <span className="text-slate-200 truncate max-w-[180px]">{selectedAsset.sourceDocument}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Page Coordinates:</span>
                  <span className="text-blue-300">Page {selectedAsset.page}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Captured Date:</span>
                  <span className="text-slate-200">{selectedAsset.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Resolution:</span>
                  <span className="text-slate-200">
                    {typeof selectedAsset.dimensions === 'object' && selectedAsset.dimensions
                      ? `${(selectedAsset.dimensions as any).width} × ${(selectedAsset.dimensions as any).height}`
                      : String(selectedAsset.dimensions || '')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Detected Relevance:</span>
                  <span className="text-emerald-400 font-semibold">{selectedAsset.detectedRelevance}</span>
                </div>
              </div>

              {/* Insertion button */}
              <button
                type="button"
                onClick={() => onInsertAssetToReport(selectedAsset)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Insert Asset into Active Report</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
