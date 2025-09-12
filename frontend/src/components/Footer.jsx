import React from 'react'
import Subscribe from '../assets/Subscribe.svg'
import { Link } from 'react-router-dom';
import PCunivers from '../assets/Asset-pc-univers.svg'
import Instagram1 from '../assets/instagram-alt 1.svg'
import Instagram2 from '../assets/instagram-alt 2.svg'

const SubscribeNewsletter = () => {
    return (
        <div className="newsletter-container">
            <h1>Subscribe to Newsletter</h1>
            <div role='menuitem' className="email-input-group">
                <input type="email" placeholder="Enter your email" />
                <button type="submit">
                    <img src={Subscribe} alt="Subscribe" /> 
                </button>
            </div>
    </div>
    );
}

const NavigateCompany = () => {
    return (
        <div role='link' className="nav-footer">
            <p>Company</p>
            <Link to='#'>Solar Assistant</Link>
            <Link to='/recipient'>Become a Partner</Link>
            <Link to='/investor'>Fund Solar Projects</Link>
        </div>
    );
}

const NavigateResourcesLegal = () => {
    return (
        <div role='link' className='nav-footer'>
            <p>Resources & Legal</p>
            <Link to='#'>FAQs</Link>
            <Link to='#'>Terms & conditions</Link>
            <Link to='#'>Privacy Policy</Link>
        </div>
    );
}

const ContactDetails = () => {
    return (
        <div role='list' className="nav-footer">
            <p>Contact Us</p>
            <p>boostytech50@gmail.com </p>
            <p>+234 9088 8888</p>
        </div>
    );
}

const Footer = () => {
  return (
    <div role='contentinfo' className='footer'>
        <div role='list' className='footer-top'>
            <SubscribeNewsletter />
            <NavigateCompany />
            <NavigateResourcesLegal />
            <ContactDetails />
        </div>
        <hr />
        <div role='list' className="footer-bottom">
            <div className="sponsor">
                <p>Backed by</p>
                <img src={PCunivers} alt="sponsor" />
            </div>
            <div className="socials">
                <Link to='#'><img src={Instagram1} alt="instagram socials" /></Link>
                <Link to='#'><img src={Instagram2} alt="instagram socials" /></Link>
                <p>Boosty&copy; 2025</p>
            </div>
        </div>
    </div>
  )
}

export default Footer
