    import { useState } from 'react';
    import { supabase } from '../supabase/client'; // we will make this next

    export default function TeacherLogin({ onLogin }) {
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [error, setError] = useState('');

      const handleLogin = async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) setError(error.message);
        else onLogin(data.user);
      }

      return (
        <div style={{padding:20, textAlign:'center'}}>
          <h2>Teacher Login</h2>
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} /><br/><br/>
          <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} /><br/><br/>
          <button onClick={handleLogin}>Login</button>
          <p style={{color:'red'}}>{error}</p>
        </div>
      )
    }
