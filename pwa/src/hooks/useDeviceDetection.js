import { useState, useEffect } from 'react'

export function useDeviceDetection() {
    const [deviceType, setDeviceType] = useState('unknown')

    useEffect(() => {
        const detectDevice = () => {
            const userAgent = navigator.userAgent.toLowerCase()
            const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
            const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent) ||
                (window.innerWidth >= 768 && window.innerWidth <= 1024)

            if (isMobile && !isTablet) {
                setDeviceType('phone')
            } else if (isTablet) {
                setDeviceType('tablet')
            } else {
                setDeviceType('laptop')
            }
        }

        detectDevice()

        // Re-detect on window resize
        window.addEventListener('resize', detectDevice)
        return () => window.removeEventListener('resize', detectDevice)
    }, [])

    return deviceType
}