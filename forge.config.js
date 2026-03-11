module.exports = {
  packagerConfig: {
    asar: true,
    name: 'Exam Form Generator',
    executableName: 'exam-form-generator',
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'ExamFormGenerator',
        setupExe: 'ExamFormGenerator-Setup.exe',
        description: 'PABSON/NPABSON Exam Form & Admit Card Generator',
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'ExamFormGenerator',
        format: 'ULFO',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          name: 'exam-form-generator',
          bin: 'exam-form-generator',
          productName: 'Exam Form Generator',
          description: 'PABSON/NPABSON Exam Form & Admit Card Generator',
          maintainer: 'PABSON',
          categories: ['Education'],
        },
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
    },
  ],
};
