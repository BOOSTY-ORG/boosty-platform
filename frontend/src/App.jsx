// import React, { useEffect } from 'react';
// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import Header from './components/Header';
// import Home from './components/Home';
// import RecipientOverview from './components/RecipientOverview';
// import InvestorOverview from './components/InvestorOverview';
// import Footer from './components/Footer';

// const App = () => {

//   useEffect(() => {
//     console.log("App mounted!!!");
//     fetch('http://localhost:9000/users')
//     .then(res => res.json())
//     .then(data => console.log(data))
//     .catch(err => console.error('Error fetching data:', err));
//   }, []);

//   return (
//     <BrowserRouter>
//       <Header />
//       <Routes>
//         <Route path='/' element={<Home />} />
//         <Route path='/recipient' element={<RecipientOverview />} />
//         <Route path='/investor' element={<InvestorOverview />} />
//       </Routes>
//       <Footer />
//     </BrowserRouter>
//   );
// }

// export default App;
