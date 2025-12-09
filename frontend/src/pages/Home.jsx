import React from 'react'

import ServiceSection from '../components/ServiseSection';
<<<<<<< HEAD
import Testimonial from '../components/Testimonial'
=======
>>>>>>> origin/fabrice

import Navbar from '../components/Navbar'
import HowItWorks from '../components/HowItWorks'
import BlogSection from '../components/Blog'
import Testimonial from '../components/Testimonial'
import Herosection from '../components/Herosection';
import About from '../components/Aboutsection';

const Home = () => {
    return (
        <div className=''>
    <Navbar />
            <Herosection/>
            <About/>
            <ServiceSection/>
            <HowItWorks />
            <BlogSection />

        <Testimonial />

        </div>
    )
}

export default Home