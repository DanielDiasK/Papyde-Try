/**
 * electron-builder config
 * Reads the packaged output from electron-forge (out/ folder) and produces
 * a proper NSIS installer (Windows) or DMG (macOS) in the dist/ folder.
 */

/** @type {import('electron-builder').Configuration} */
const config = {
    appId: 'com.papyde.app',
    productName: 'Papyde',
    copyright: 'Copyright © 2025 Papyde',

    // Configuração oficial para o autoUpdater (GitHub)
    publish: [
        {
            provider: 'github',
            owner: 'DanielDiasK',
            repo: 'Papyde-Try',
        },
    ],

    // Point to the already-packaged app produced by electron-forge
    // We'll use the dist folder for electron-builder output
    directories: {
        output: 'dist',
    },

    // Build from the vite output (built by our build script)
    files: [
        'dist-electron/**/*',
        'dist-renderer/**/*',
        'package.json',
    ],

    extraMetadata: {
        main: 'dist-electron/main.js',
    },

    win: {
        target: [
            {
                target: 'nsis',
                arch: ['x64'],
            },
        ],
        icon: 'src/assets/icon.png',
    },

    nsis: {
        oneClick: false,
        perMachine: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: 'Papyde',
        deleteAppDataOnUninstall: false,
    },

    mac: {
        target: [
            {
                target: 'dmg',
                arch: ['x64', 'arm64'],
            },
        ],
        icon: 'src/assets/icon.png',
        category: 'public.app-category.productivity',
        darkModeSupport: true,
    },

    dmg: {
        title: 'Papyde',
        icon: 'src/assets/icon.png',
    },

    asar: true,
    compression: 'maximum',
    removePackageScripts: true,
};

module.exports = config;
