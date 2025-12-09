import React from 'react'
import Testimonial from '../components/Testimonial';
import Navbar from '../components/Navbar'
import ServiceSection from '../components/ServiseSection'


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