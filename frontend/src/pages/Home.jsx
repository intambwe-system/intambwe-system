import React from 'react'
import ServiceSection from '../components/ServiseSection';
import Navbar from '../components/Navbar'
import HowItWorks from '../components/HowItWorks'
import BlogSection from '../components/Blog'
import Testimonial from '../components/Testimonial'
import Herosection from '../components/Herosection';
import Aboutsection from '../components/Aboutsection';

const Home = () => {
    return (
        <div className=''>

            <Herosection/>
            <Aboutsection/>
            <ServiceSection/>
            <HowItWorks />
            <BlogSection />

        <Testimonial />

        </div>
    )
}

export default Home