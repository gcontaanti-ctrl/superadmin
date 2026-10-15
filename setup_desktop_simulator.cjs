const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'public', 'Simulador-Smartphone-Universal.html');
const desktopDir = path.join(process.env.USERPROFILE, 'Desktop');
const destHtml = path.join(desktopDir, 'Simulador-Smartphone-Universal.html');
const destShortcut = path.join(desktopDir, 'Simulador Smartphone Mobile.url');

try {
  fs.copyFileSync(src, destHtml);
  console.log('✅ HTML copiado para a Área de Trabalho:', destHtml);

  const shortcutContent = `[InternetShortcut]\nURL=file:///${destHtml.replace(/\\/g, '/')}\n`;
  fs.writeFileSync(destShortcut, shortcutContent, 'utf8');
  console.log('✅ Atalho criado na Área de Trabalho:', destShortcut);
} catch (e) {
  console.error('Erro ao instalar no Desktop:', e);
}
