const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } = require('docx');
const fs = require('fs');

// Este script usa o mesmo conteúdo do relatório HTML e gera um .docx
// Para usar:
// 1) npm init -y
// 2) npm install docx
// 3) node generate_relatorio_docx.js

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({ text: 'PARADIGMAS DE PROGRAMAÇÃO APLICADOS NO DESENVOLVIMENTO DO PROJETO MEGASTREAMHD', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: 'Uma Análise dos Paradigmas Orientado a Eventos, Declarativo e Imperativo', alignment: AlignmentType.CENTER }),
      new Paragraph({ text: '' }),

      new Paragraph({ text: 'RESUMO', heading: HeadingLevel.HEADING_1 }),
      new Paragraph('Este relatório apresenta uma análise detalhada dos paradigmas de programação aplicados no desenvolvimento do projeto MegaStreamHD, uma plataforma web interativa de streaming de filmes e séries desenvolvida em JavaScript puro (Vanilla JS).'),

      new Paragraph({ text: '1. INTRODUÇÃO', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: '1.1 Contextualização', heading: HeadingLevel.HEADING_2 }),
      new Paragraph('O projeto MegaStreamHD surge como resposta ao Projeto 9 da disciplina de Linguagens de Programação...'),

      // Nota: por simplicidade, este gerador inclui apenas seções principais. Para um .docx completo, pode-se expandir o array "children" com todo o conteúdo.

      new PageBreak(),
      new Paragraph({ text: 'Gerado com script', spacing: { before: 200 } })
    ]
  }]});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('./Relatorio_Paradigmas_MegaStreamHD.docx', buffer);
  console.log('✅ Relatório .docx gerado em Relatorio_Paradigmas_MegaStreamHD.docx');
}).catch(err => console.error(err));
