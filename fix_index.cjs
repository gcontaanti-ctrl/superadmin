const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add import
if (!content.includes('import { Estoque }')) {
    content = content.replace(
        'import { ValidadeCritica } from "@/components/executive/ValidadeCritica";',
        'import { ValidadeCritica } from "@/components/executive/ValidadeCritica";\nimport { Estoque } from "@/components/executive/Estoque";'
    );
}

// 2. Replace the Estoque Tab content
const startMarker = '{/* Estoque Tab */}';
const endMarker = '{/* Financeiro Tab */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `{/* Estoque Tab */}
        {activeTab === "estoque" && (
          <Estoque />
        )}

        `;
    
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Substituição feita com sucesso!");
} else {
    console.log("Não achou os marcadores");
}
