import React from 'react'
import ServiceSection from '../components/ServiseSection';
import Navbar from '../components/Navbar'
import Testimonial from '../components/Testimonial'
import Herosection from '../components/Herosection';
import Aboutsection from '../components/Aboutsection';


const Home = () => {
    return (
        <div>
            <Navbar />
            <Herosection/>
            <Aboutsection/>

            <ServiceSection/>

        <Testimonial />

        </div>
    )
}

export default Home