import React from 'react'
import dallEillustration from '../assets/DALL.E.illustration.png'
import assistantImage from '../assets/Boosty-animation.svg'
import speechBubble from '../assets/Union.svg'
import botSparkle from '../assets/Bot-Sparkle.svg'
import walletCreditCard from '../assets/Wallet-Credit-Card.svg'
import location from '../assets/Location.svg'
import carbonCloud from '../assets/CO2Cloud.svg'

export const RecipientMain = () => {
    return (
        <main className="usertype-overview">concise overview of key features and benefits relevant to recipients</main>
    );
}

export const InvestorMain = () => {
    return (
        <main className="usertype-overview">concise overview of key features and benefits relevant to investors</main>
    )
}

export const HomeMain = () => {
  return (
    <main className='onboarding'>
      <section className='hero-section'>
        <h1>Start Your Solar Journey with the Solar Assistant 👉🏾</h1>
        <p>Calculate your energy needs, customize your system, and choose financing options.</p>
        <form action="/api/solar-assistant" method="post">
            <div className="assistant-container">
                <img src={assistantImage} alt="Assistant" />
                <img src={speechBubble} alt="Speech Bubble" />
                <p>Wetin you wan use Solar do?</p>
            </div>
            <fieldset>
                <legend>What do you want to use solar for?</legend>
                <div role='menuitem'>
                    <label htmlFor="solar-usage-business">
                        <input type="checkbox" name="solar-business" id="solar-usage-business" />
                        For My Business
                    </label>
                    <label htmlFor="solar-usage-home">
                        <input type="checkbox" name="solar-home" id="solar-usage-home" />
                        For My Home
                    </label>
                </div>
                <div role='menuitem'>
                    <label htmlFor="address-details">
                        <input type="text" name="address-details" id="address-details" />
                        What’s Your Address?
                    </label>
                    <label htmlFor="budget-details">
                        <input type="text" name="budget-details" id="budget-details" />
                        What’s Your Budget? (Naira)
                    </label>
                </div>
            </fieldset>
            <button type="submit">Continue</button>
        </form>
      </section>
      <section>
        <img src={dallEillustration} alt="A bright and hopeful illustration capturing the theme" />
        <h2>Powering Nigeria, One Solar System at a Time</h2>
        <p>Millions in Nigeria face unreliable electricity, rising petrol costs, and the complexity of adopting solar energy. Boosty’s Solar Assistant simplifies energy calculations, customizes solutions, and offers flexible financing to make clean energy accessible.</p>
      </section>
      <section>
        <h2>From Calculation to Installation in 3 Simple Steps</h2>
        <button>Start Your Journey Now</button>
        <ol>
            <li>Use the Solar Assistant to estimate your energy needs and savings.</li>
            <li>Customize your system, and explore financing options.</li>
            <li>Schedule installation and enjoy reliable, clean energy.</li>
        </ol>
      </section>
      <section>
        <h2>Designed for Nigerians, Built for Your Energy Needs</h2>
        <div role='list'>
            <div role='listitem' className="card">
                <figure>
                    <img src={botSparkle} alt="Sparkle Bot" />
                    <figcaption>Smart Solar Assistant</figcaption>
                </figure>
                <p>Personalize your solar energy system in minutes.</p>
            </div>
            <div role='listitem' className="card">
                <figure>
                    <img src={walletCreditCard} alt="Credit Card Wallet" />
                    <figcaption>Flexible Financing</figcaption>
                </figure>
                <p>Buy Now, Pay Later for verified users or pay upfront.</p>
            </div>
            <div role='listitem' className="card">
                <figure>
                    <img src={location} alt="locate ends" />
                    <figcaption>End-to-End Support</figcaption>
                </figure>
                <p>From customization of solar system to professional installation.</p>
            </div>
            <div role='listitem' className="card">
                <figure>
                    <img src={carbonCloud} alt="CO2 Cloud" />
                    <figcaption>CO2 Savings Tracker</figcaption>
                </figure>
                <p>See how you’re contributing to a greener future.</p>
            </div>
        </div>
        <button>Start Now</button>
      </section>
      <section>
        <h2>Frequently Asked Questions</h2>
        <div role='list'>
            <details>
                <summary>Am I eligible for solar financing?</summary>
                <p>Eligibility is determined by the vetting process of our financial partners. Start by using the Solar Assistant and selecting the BNPL ('pay small-small') option to begin the process.</p>
            </details>
            <details>
                <summary>How quickly can I get approved for financing?</summary>
                <p>Approvals typically take 1-3 business days once all required documents are submitted.</p>
            </details>
            <details>
                <summary>Is Boosty available to residential?</summary>
                <p>Yes, Boosty serves both residential and commercial customers.</p>
            </details>
            <details>
                <summary>How does the Energy Assistant work?</summary>
                <p>The Energy Assistant calculates your energy needs, recommends the right solar system, and helps you manage payments.</p>
            </details>
            <details>
                <summary>Can I pay of my loan early?</summary>
                <p>Yes, you can pay off your loan early without any penalties.</p>
            </details>
        </div>
      </section>
    </main>
  )
}
