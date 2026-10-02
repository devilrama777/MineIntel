import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  BookOpen,
  MessageSquare,
  FileQuestion,
  ChevronDown,
  Layers,
  Sparkles,
  ShieldCheck,
  Mail,
  Phone,
  ExternalLink,
} from 'lucide-react';

export const HelpSupportPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does topic modeling work in MineIntel?',
      a: 'MineIntel implements an unsupervised neural topic modeling architecture (Sentence-BERT + UMAP dimensionality reduction + HDBSCAN density clustering). Unlike traditional keyword frequency counts, the model embeds complete geological sentences into high-dimensional semantic vector spaces, grouping semantically related terminology (e.g. aquifer breaching, hydraulic head, artesian pressure) into coherent topical clusters.',
    },
    {
      q: 'How are emerging topics detected and flagged?',
      a: 'Emerging topics are identified using a temporal velocity gradient algorithm. The system computes the month-over-month derivative of topic mention frequencies across incoming filings. When a topic’s velocity exceeds +25% over its baseline 24-month rolling average, an automated Emerging Alert is triggered along with an investigation directive.',
    },
    {
      q: 'How is topic coherence calculated?',
      a: 'We evaluate topic quality using the standard C_v topic coherence score. It measures the degree of semantic similarity between high-scoring words in each topic based on normalized pointwise mutual information (NPMI) computed over the complete CMPDI geological corpus. Our active model sustains an aggregate coherence score of 86.8%, indicating clean thematic separation without noisy overlaps.',
    },
    {
      q: 'How are unstructured reports processed and normalized?',
      a: 'Raw geological PDF and CSV dockets pass through the sovereign MineIntel Ingestion Engine. The pipeline parses optical OCR text, reconstructs tabular strata data (thickness, ash content, stripping ratios), extracts mathematical formulas, and indexes all factual tokens into an ephemeral SQLite BM25 full-text catalog.',
    },
    {
      q: 'How often is the model retrained?',
      a: 'The MineIntel Sentence-BERT model is scheduled for automated retraining every 30 days (next scheduled: 25 Oct 2026). In addition, designated CMPDI Master Analysts can manually trigger on-demand retraining from the Model & System Health dashboard whenever a new batch of regional borehole surveys is ingested.',
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-amber-400" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
            Documentation &amp; User Guidance
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
          Help &amp; Support Enclave
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Technical specifications, algorithmic methodologies, frequently asked questions, and CMPDI support channels.
        </p>
      </div>

      {/* Search Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-[#0d1628] via-[#090f1d] to-[#0d1628] p-8 text-center shadow-xl space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          How can we help your geological investigation today?
        </h2>
        <div className="max-w-xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documentation, algorithms, or guidelines..."
            className="w-full rounded-2xl border border-slate-700 bg-[#121c33] pl-11 pr-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-amber-500 shadow-inner"
          />
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
          <FileQuestion className="h-4 w-4" /> Frequently Asked Analytical Questions
        </div>

        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-[#080d17] overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left text-sm font-semibold text-white hover:text-amber-300 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3 font-normal animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Support Channels & Contact Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-5 space-y-2">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Official User Manual</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Download the complete PDF handbook detailing SOPs for DGMS report interpretation and coherence calibration.
          </p>
          <button
            onClick={() => alert('CMPDI Analyst Handbook v3.4 downloaded.')}
            className="text-xs font-semibold text-amber-400 hover:underline pt-1 block"
          >
            Download Handbook (.PDF) →
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-5 space-y-2">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 w-fit">
            <Mail className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-white text-sm">CMPDI Helpdesk</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Direct communication line with the central Ranchi AI modeling and geological computing cell.
          </p>
          <a
            href="mailto:support@cmpdi.co.in"
            className="text-xs font-semibold text-cyan-400 hover:underline pt-1 block font-mono"
          >
            support@cmpdi.co.in
          </a>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-5 space-y-2">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
            <Phone className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Emergency DGMS Hotline</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            24/7 high-priority telephone hotline for urgent bench slope alerts and underground inundation threats.
          </p>
          <span className="text-xs font-bold text-emerald-400 font-mono pt-1 block">
            +91 (0651) 223-1104 / 05
          </span>
        </div>
      </div>
    </div>
  );
};
