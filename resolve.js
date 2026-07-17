const fs = require('fs');
let content = fs.readFileSync('src/app/proveedores/page.tsx', 'utf8');

// block 1 - Manual merge
content = content.replace(/<<<<<<< HEAD\r?\nimport ConfirmModal from '@\/components\/ConfirmModal';\r?\nimport { Printer, FileSpreadsheet, Edit3, Trash2, BookOpen } from 'lucide-react';\r?\nimport AlertBanner from '@\/components\/AlertBanner';\r?\n=======\r?\nimport { Printer, FileSpreadsheet, Edit3, Trash2, RefreshCw } from 'lucide-react';\r?\nimport ConfirmationModal from '@\/components\/ConfirmationModal';\r?\n>>>>>>> origin\/develop/g, `import { Printer, FileSpreadsheet, Edit3, Trash2, BookOpen, RefreshCw } from 'lucide-react';\nimport AlertBanner from '@/components/AlertBanner';\nimport ConfirmationModal from '@/components/ConfirmationModal';`);

// remaining blocks - Keep origin/develop
content = content.replace(/<<<<<<< HEAD[\s\S]*?=======\r?\n([\s\S]*?)\r?\n>>>>>>> origin\/develop/g, '$1');

fs.writeFileSync('src/app/proveedores/page.tsx', content);
