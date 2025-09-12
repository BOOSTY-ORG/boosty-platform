import React from 'react'
import {  Link, useNavigate } from 'react-router-dom'
import Boosty from '../assets/Boosty.svg'

export const HeaderNavigation = () => {
    return (
        <nav>
            <Link to='/'>Home</Link>
            <Link to='/recipient'>Become a partner</Link>
            <Link to='/investor'>Want to fund solar projects?</Link>
        </nav>
    );
}

export const SignInButton = () => {
    const navigate = useNavigate();
    return (
        <button onClick={() => navigate('/signin')}>Sign In</button>
    );
}

const Header = () => {
  return (
    <header>
        <img src={Boosty} alt="Boosty logo" />
        <HeaderNavigation />
        <SignInButton />      
    </header>
  )
}


export default Header


