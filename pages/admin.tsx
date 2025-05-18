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
      
      // Check if Supabase client is available
      if (!supabase) {
        console.error('Supabase client is not initialized. Check your environment variables.');
        setLoading(false);
        return;
      }
      
      try {
        // We've already checked supabase is not null above, but TypeScript needs this assertion
        const supabaseClient = supabase!;
        
        // Fetch all phone numbers
        const { data: numbers, error: numErr } = await supabaseClient
          .from('phone_numbers')
          .select('*');
        
        if (numErr) {
          console.error('Error fetching phone numbers:', numErr);
          setLoading(false);
          return;
        }
        
        if (!numbers) {
          setLoading(false);
          return;
        }
        
        // For each number, fetch calls and messages
        const numbersWithCalls: PhoneNumberWithCalls[] = await Promise.all(
          numbers.map(async (number) => {
            const { data: calls, error: callsErr } = await supabaseClient
              .from('calls')
              .select('*')
              .eq('phone_number_id', number.id);
              
            if (callsErr) {
              console.error(`Error fetching calls for number ${number.id}:`, callsErr);
              return { ...number, calls: [] };
            }
            
            const callsWithMessages: CallWithMessages[] = calls
              ? await Promise.all(
                  calls.map(async (call) => {
                    const { data: messages, error: msgErr } = await supabaseClient
                      .from('messages')
                      .select('*')
                      .eq('call_id', call.id)
                      .order('sent_at', { ascending: true });
                      
                    if (msgErr) {
                      console.error(`Error fetching messages for call ${call.id}:`, msgErr);
                      return { ...call, messages: [] };
                    }
                    
                    return { ...call, messages: messages || [] };
                  })
                )
              : [];
            return { ...number, calls: callsWithMessages };
          })
        );
        
        setData(numbersWithCalls);
      } catch (err) {
        console.error('Unexpected error fetching data:', err);
      } finally {
        setLoading(false);
      }
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
