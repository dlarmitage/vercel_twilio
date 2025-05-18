import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { PhoneNumber, Call, Message } from '../types/supabase';

interface CallWithMessages extends Call {
  messages: Message[];
}

interface PhoneNumberWithCalls extends PhoneNumber {
  calls: CallWithMessages[];
}

export default function AdminPanel() {
  const [data, setData] = useState<PhoneNumberWithCalls[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch all phone numbers
      const { data: numbers, error: numErr } = await supabase
        .from('phone_numbers')
        .select('*');
      if (numErr || !numbers) {
        setLoading(false);
        return;
      }
      // For each number, fetch calls and messages
      const numbersWithCalls: PhoneNumberWithCalls[] = await Promise.all(
        numbers.map(async (number) => {
          const { data: calls } = await supabase
            .from('calls')
            .select('*')
            .eq('phone_number_id', number.id);
          const callsWithMessages: CallWithMessages[] = calls
            ? await Promise.all(
                calls.map(async (call) => {
                  const { data: messages } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('call_id', call.id)
                    .order('sent_at', { ascending: true });
                  return { ...call, messages: messages || [] };
                })
              )
            : [];
          return { ...number, calls: callsWithMessages };
        })
      );
      setData(numbersWithCalls);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Admin: Phone Numbers, Calls, and Messages</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          {data.map((pn) => (
            <div key={pn.id} style={{ marginBottom: 32, border: '1px solid #ccc', borderRadius: 8, padding: 16 }}>
              <h2>Number: {pn.number}</h2>
              {pn.calls.length === 0 ? (
                <p>No calls.</p>
              ) : (
                pn.calls.map((call) => (
                  <div key={call.id} style={{ margin: '16px 0', padding: 12, background: '#f9f9f9', borderRadius: 6 }}>
                    <div><b>Call:</b> {call.id} <span style={{ color: '#888' }}>({call.started_at})</span></div>
                    {call.summary && <div><i>Summary:</i> {call.summary}</div>}
                    <div style={{ marginTop: 8 }}>
                      <b>Messages:</b>
                      {call.messages.length === 0 ? (
                        <div>No messages.</div>
                      ) : (
                        <ul style={{ paddingLeft: 20 }}>
                          {call.messages.map((msg) => (
                            <li key={msg.id}>
                              <span style={{ color: msg.direction === 'inbound' ? '#0070f3' : '#333' }}>
                                [{msg.direction}] {msg.body}
                              </span>
                              <span style={{ color: '#888', marginLeft: 8 }}>({msg.sent_at})</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
