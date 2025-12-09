import React from 'react'

import Navbar from '../components/Navbar';
import ServiceSection from '../components/ServiseSection';
import Testimonial from '../components/Testimonial'


const Home = () => {
    return (
        <div>
            <Navbar />

            <ServiceSection/>

        <Testimonial />

        </div>
    )
}

export default Home