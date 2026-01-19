import React from 'react'
import Spline from '@splinetool/react-spline';
import Antigravity from '../components/Antigravity';
// import SignUp from '../components/SignUp';

const Home = () => {
  return (
    <div className='h-screen w-screen flex bg-black overflow-hidden'>
      <div className='h-full w-full scale-115 ml-80 mt-5 '>      
        <Spline scene="https://prod.spline.design/dNxdAMewwoL839wi/scene.splinecode" />
      </div>
    </div>
  )
}

export default Home