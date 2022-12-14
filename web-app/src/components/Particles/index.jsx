import ReactParticles from 'react-tsparticles';

const Particles = () => (
    <ReactParticles
        id="tsparticles"
        options={{
            fpsLimit: 120,
            interactivity: {
                events: {
                    onHover: {
                        enable: true,
                        mode: 'repulse',
                    },
                    resize: true,
                },
                modes: {
                    repulse: {
                        distance: 100,
                        duration: 0.4,
                    },
                },
            },
            particles: {
                color: {
                    value: '#ffffff',
                },
                links: {
                    color: '#ffffff',
                    distance: 120,
                    enable: true,
                    opacity: 0.2,
                    width: 0.5,
                },
                collisions: {
                    enable: true,
                },
                move: {
                    direction: 'none',
                    enable: true,
                    outMode: 'bounce',
                    random: false,
                    speed: 0.5,
                    straight: false,
                },
                number: {
                    density: {
                        enable: true,
                        area: 700,
                    },
                    value: 100,
                },
                opacity: {
                    value: 0.1,
                },
                shape: {
                    type: 'circle',
                },
                size: {
                    random: true,
                    value: 5,
                },
            },
            detectRetina: true,
        }}
        style={{ zIndex: -1 }}
    />
);

export default Particles;
