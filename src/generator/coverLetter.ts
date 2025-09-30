import fs from 'node:fs/promises';
import path from 'node:path';

type Vars = {
  company: string;
  title: string;
  applicantName: string;
  linkedin: string;
  github: string;
  stackFocus: string;
  projectSnippet: string;
};

export async function generateCoverLetter(vars: Vars): Promise<string> {
  const templatePath = path.resolve('src/templates/cover_letter.txt');
  const tpl = await fs.readFile(templatePath, 'utf-8');
  return tpl
    .replaceAll('${company}', vars.company)
    .replaceAll('${title}', vars.title)
    .replaceAll('${applicantName}', vars.applicantName)
    .replaceAll('${linkedin}', vars.linkedin)
    .replaceAll('${github}', vars.github)
    .replaceAll('${stackFocus}', vars.stackFocus)
    .replaceAll('${projectSnippet}', vars.projectSnippet);
}