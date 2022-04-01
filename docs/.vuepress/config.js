module.exports = {
    title: 'ChAoS UnItY\'s Blog',
    description: 'ChAoS UnItY\'s codex archive',
    theme: 'reco',
    locales: {
        '/': {
            lang: 'zh-TW'
        }
    },
    themeConfig: {
        nav: [
            { text: 'Home', link: '/' },
            { text: 'About me', link: '/about/me' },
            { text: 'Pivot', link: '/index' },
            {
                text: 'External Links',
                items: [
                    { text: 'GitHub', link: 'https://github.com/ChAoSUnItY' },
                    { text: 'CASC Lang', link: 'https://github.com/CASC-Lang' }
                ]
            }
        ]
    }
}