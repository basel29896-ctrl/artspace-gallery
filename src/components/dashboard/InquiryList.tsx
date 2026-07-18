'use client';

import { useState } from 'react';
import type { InquiryStatus } from '@/lib/database.types';

export type DashboardInquiry = {
  id: string;
  buyer_name: string;
  buyer_phone: string;
  message: string;
  status: InquiryStatus;
  created_at: string;
  artwork_title: string;
};

const STATUSES: InquiryStatus[] = ['new', 'contacted', 'closed'];

const STATUS_STYLE: Record<InquiryStatus, string> = {
  new: 'bg-amber-100 text-amber-900 border-amber-200',
  contacted: 'bg-sky-100 text-sky-900 border-sky-200',
  closed: 'bg-stone-100 text-stone-600 border-stone-200',
};

export function InquiryList({ inquiries }: { inquiries: DashboardInquiry[] }) {
  const [items, setItems] = useState(inquiries);
  const [failed, setFailed] = useState<string | null>(null);

  async function setStatus(id: string, status: InquiryStatus) {
    const previous = items;
    setItems((current) => current.map((i) => (i.id === id ? { ...i, status } : i)));
    setFailed(null);

    const res = await fetch(`/api/inquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      setItems(previous);
      setFailed(id);
    }
  }

  if (items.length === 0) {
    return <p className="py-10 text-sm text-stone-500">No inquiries yet.</p>;
  }

  return (
    <ul className="divide-y divide-stone-200">
      {items.map((inquiry) => (
        <li key={inquiry.id} className="py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-stone-900">{inquiry.buyer_name}</p>
              <p className="text-sm text-stone-600">
                <a href={`tel:${inquiry.buyer_phone}`} className="underline underline-offset-2">
                  {inquiry.buyer_phone}
                </a>
                <span className="text-stone-400"> · on {inquiry.artwork_title}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${STATUS_STYLE[inquiry.status]}`}
              >
                {inquiry.status}
              </span>

              <label className="sr-only" htmlFor={`status-${inquiry.id}`}>
                Change status for {inquiry.buyer_name}
              </label>
              <select
                id={`status-${inquiry.id}`}
                value={inquiry.status}
                onChange={(e) => setStatus(inquiry.id, e.target.value as InquiryStatus)}
                className="rounded-sm border border-stone-300 bg-white px-2 py-1 text-xs focus:border-stone-800 focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
            {inquiry.message}
          </p>

          <p className="mt-2 text-xs text-stone-400">
            {new Date(inquiry.created_at).toLocaleString()}
          </p>

          {failed === inquiry.id ? (
            <p role="alert" className="mt-2 text-xs text-red-700">
              Could not update status. Please try again.
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
