'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventInput } from '@fullcalendar/core';
import { X, MapPin, Users, FileText, Download } from 'lucide-react';

export interface CalendarEventData {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  allDay: boolean;
  eventType: string;
  location: string | null;
  attendees: string[];
  notes: { id: string; title: string; body: string | null }[];
}

const TYPE_COLOR: Record<string, string> = {
  meeting: '#06b6d4',
  client_call: '#22d3ee',
  milestone: '#10b981',
  deadline: '#f43f5e',
  review: '#8b5cf6',
  internal: '#71717a',
  other: '#a1a1aa',
};

export function CalendarView({ events }: { events: CalendarEventData[] }) {
  const [active, setActive] = useState<CalendarEventData | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const calRef = useRef<FullCalendar | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const eventsById = useMemo(() => {
    const m = new Map<string, CalendarEventData>();
    for (const e of events) m.set(e.id, e);
    return m;
  }, [events]);

  const fcEvents: EventInput[] = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        allDay: e.allDay,
        backgroundColor: TYPE_COLOR[e.eventType] ?? TYPE_COLOR.meeting,
        borderColor: TYPE_COLOR[e.eventType] ?? TYPE_COLOR.meeting,
        textColor: '#09090b',
      })),
    [events],
  );

  function handleClick(arg: EventClickArg) {
    const ev = eventsById.get(arg.event.id);
    if (ev) setActive(ev);
  }

  return (
    <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-3 sm:p-5 sage-calendar">
      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: isMobile ? 'listWeek,dayGridMonth' : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        height="auto"
        contentHeight={isMobile ? 'auto' : 700}
        events={fcEvents}
        eventClick={handleClick}
        nowIndicator
        firstDay={1}
        dayMaxEventRows={3}
        eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
      />

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#27272a] bg-[#09090B] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#27272a]">
              <div className="min-w-0">
                <h2 id="event-title" className="text-base font-semibold text-[#fafafa] truncate">
                  {active.title}
                </h2>
                <p className="text-xs text-[#71717a] mt-0.5">
                  {formatRange(active.start, active.end, active.allDay)}
                </p>
              </div>
              <button
                onClick={() => setActive(null)}
                aria-label="Close"
                className="p-1 rounded-md text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 text-sm text-[#a1a1aa] max-h-[60vh] overflow-y-auto">
              {active.description && (
                <p className="whitespace-pre-wrap text-[#e4e4e7]">{active.description}</p>
              )}
              {active.location && (
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{active.location}</span>
                </div>
              )}
              {active.attendees.length > 0 && (
                <div className="text-xs">
                  <div className="flex items-center gap-2 mb-2 text-[#71717a]">
                    <Users className="w-3.5 h-3.5" /> Attendees
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {active.attendees.map((a, idx) => (
                      <li
                        key={idx}
                        className="rounded-md bg-[#18181b] border border-[#27272a] px-2 py-0.5"
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {active.notes.length > 0 && (
                <div className="text-xs">
                  <div className="flex items-center gap-2 mb-2 text-[#71717a]">
                    <FileText className="w-3.5 h-3.5" /> Notes
                  </div>
                  <ul className="space-y-3">
                    {active.notes.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-lg border border-[#27272a] bg-[#0f0f12] p-3"
                      >
                        <div className="font-medium text-[#fafafa] mb-1">{n.title}</div>
                        {n.body && (
                          <p className="text-[#a1a1aa] whitespace-pre-wrap">{n.body}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!active.description &&
                !active.location &&
                active.attendees.length === 0 &&
                active.notes.length === 0 && (
                  <p className="text-xs text-[#52525b]">No additional details.</p>
                )}
            </div>
            <div className="px-5 py-3 border-t border-[#27272a] flex items-center justify-end gap-2">
              <a
                href={`/api/portal/calendar/${active.id}/ics`}
                download
                data-testid="ics-download-link"
                className="inline-flex items-center gap-1.5 rounded-md border border-[#27272a] bg-[#18181b] hover:bg-[#27272a] text-[#fafafa] text-xs px-3 py-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Add to calendar
              </a>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .sage-calendar .fc {
          color: #e4e4e7;
          font-size: 13px;
        }
        .sage-calendar .fc .fc-toolbar-title {
          font-size: 1rem;
          font-weight: 600;
          color: #fafafa;
        }
        .sage-calendar .fc .fc-button {
          background: #18181b;
          border: 1px solid #27272a;
          color: #a1a1aa;
          text-transform: capitalize;
          box-shadow: none;
        }
        .sage-calendar .fc .fc-button:hover {
          background: #27272a;
          color: #fafafa;
        }
        .sage-calendar .fc .fc-button-primary:not(:disabled).fc-button-active,
        .sage-calendar .fc .fc-button-primary:not(:disabled):active {
          background: #06b6d4;
          border-color: #06b6d4;
          color: #09090b;
        }
        .sage-calendar .fc-theme-standard td,
        .sage-calendar .fc-theme-standard th,
        .sage-calendar .fc-theme-standard .fc-scrollgrid {
          border-color: #27272a;
        }
        .sage-calendar .fc-day-today {
          background: rgba(6, 182, 212, 0.06) !important;
        }
        .sage-calendar .fc-col-header-cell-cushion,
        .sage-calendar .fc-daygrid-day-number,
        .sage-calendar .fc-list-day-text,
        .sage-calendar .fc-list-day-side-text {
          color: #a1a1aa;
          text-decoration: none;
        }
        .sage-calendar .fc-list-event:hover td {
          background: #18181b;
        }
        .sage-calendar .fc-event {
          cursor: pointer;
          border-radius: 4px;
          padding: 1px 4px;
        }
      `}</style>
    </div>
  );
}

function formatRange(start: string, end: string, allDay: boolean) {
  const s = new Date(start);
  const e = new Date(end);
  const dateFmt: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  if (allDay) return s.toLocaleDateString('en-US', dateFmt);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) {
    return `${s.toLocaleDateString('en-US', dateFmt)} · ${s.toLocaleTimeString(
      'en-US',
      timeFmt,
    )} – ${e.toLocaleTimeString('en-US', timeFmt)}`;
  }
  return `${s.toLocaleString('en-US', { ...dateFmt, ...timeFmt })} – ${e.toLocaleString(
    'en-US',
    { ...dateFmt, ...timeFmt },
  )}`;
}
