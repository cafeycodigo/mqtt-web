module.exports = {
    content: {
        relative: true,
        files: [
            '../{domotica-hogar,operacion-metro,alimentacion-mascotas,seguimiento-entregas,buzon-correo}/*.html',
            '../condominio-inteligente/*.{html,js}',
        ],
    },
    safelist: ['status-pending', 'status-intransit', 'status-delivered', 'status-cancelled'],
    theme: {
        extend: {
            colors: {
                paper: 'var(--color-paper)',
                surface: 'var(--color-surface)',
                ink: 'var(--color-ink)',
                muted: 'var(--color-muted)',
                line: 'var(--color-line)',
                accent: 'var(--color-accent)',
                'on-accent': 'var(--color-on-accent)',
                soft: 'var(--color-soft)',
                warning: 'var(--color-warning)',
                'warning-soft': 'var(--color-warning-soft)',
                danger: 'var(--color-danger)',
                'danger-soft': 'var(--color-danger-soft)',
                water: 'var(--color-water)',
            },
            fontFamily: {
                body: 'var(--font-body)',
                display: 'var(--font-display)',
            },
            borderRadius: { panel: 'var(--radius-panel)' },
        },
    },
};
