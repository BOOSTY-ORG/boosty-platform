import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SignIn from '../../components/auth/SignIn.jsx';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [userRole, setUserRole] = React.useState('user');

  useEffect(() => {
    const role = searchParams.get('role');
    if (role && (role === 'admin' || role === 'user')) {
      setUserRole(role);
    }
  }, [searchParams]);

  return <SignIn type={userRole} />;
};

export default Login;