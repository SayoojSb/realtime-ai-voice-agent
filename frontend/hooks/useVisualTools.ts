'use client';

import { useCallback, useEffect, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import type { RemoteParticipant } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';

export type VisualView =
  | 'none'
  | 'services'
  | 'service-detail'
  | 'process'
  | 'lead-fields';

export interface VisualToolState {
  activeView: VisualView;
  serviceDetailName: string;
  leadFields: Record<string, string>;
}

const INITIAL_STATE: VisualToolState = {
  activeView: 'none',
  serviceDetailName: '',
  leadFields: {},
};

interface ToolPayload {
  tool: string;
  service_name?: string;
  field?: string;
  value?: string;
}

export function useVisualTools() {
  const room = useMaybeRoomContext();
  const [state, setState] = useState<VisualToolState>(INITIAL_STATE);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  useEffect(() => {
    if (!room) return;

    const handler = (
      payload: Uint8Array,
      _participant?: RemoteParticipant,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic !== 'visual-tool') return;

      let data: ToolPayload;
      try {
        data = JSON.parse(new TextDecoder().decode(payload));
      } catch {
        return;
      }

      switch (data.tool) {
        case 'show_services_slide':
          setState((s) => ({ ...s, activeView: 'services' }));
          break;

        case 'show_service_detail':
          setState((s) => ({
            ...s,
            activeView: 'service-detail',
            serviceDetailName: data.service_name ?? '',
          }));
          break;

        case 'show_process_diagram':
          setState((s) => ({ ...s, activeView: 'process' }));
          break;

        case 'update_lead_field':
          if (data.field && data.value) {
            setState((s) => ({
              ...s,
              activeView: s.activeView === 'none' ? 'lead-fields' : s.activeView,
              leadFields: { ...s.leadFields, [data.field!]: data.value! },
            }));
          }
          break;
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  return { ...state, reset };
}
