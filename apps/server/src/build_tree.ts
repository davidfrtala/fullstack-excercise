import { readFile, writeFile } from 'fs/promises';
import path from 'path';

interface InputEntry {
  hash: string;
  parentHash: string | null;
  name: string;
  size: number;
}

interface TreeNode {
  id: string;
  name: string;
  size: number;
  children: TreeNode[];
}

const ASSETS_PATH = path.join(__dirname, 'assets');
const inputPath = path.join(ASSETS_PATH, 'out.json');
const outputPath = path.join(ASSETS_PATH, 'tree.json');

/*
 * Builds a tree from a flat array of InputEntry elements.
 *
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */
function buildTree(entries: InputEntry[]): TreeNode | null {
  if (entries.length === 0) {
    return null;
  }

  // Map to track nodes by their hash
  const nodeMap = new Map<string, TreeNode>();
  let root: TreeNode | null = null;

  // First pass: create all nodes
  for (const entry of entries) {
    const node: TreeNode = {
      id: entry.hash,
      name: entry.name.split(' > ').pop() || entry.name, // Just the segment name
      size: entry.size,
      children: [],
    };
    nodeMap.set(entry.hash, node);
  }

  // Second pass: link children to parents
  for (const entry of entries) {
    const node = nodeMap.get(entry.hash) as TreeNode;

    // If the parent hash is null, this is the root node
    if (entry.parentHash === null) {
      root = node;
      continue;
    }

    // Find parent and add this node as child
    const parent = nodeMap.get(entry.parentHash);
    if (parent) {
      parent.children.push(node);
    } else {
      // This shouldn't happen if data is consistent, but handle gracefully
      console.warn(
        `Parent hash ${entry.parentHash} not found for entry ${entry.hash}`
      );
    }
  }

  return root;
}

async function main() {
  const startTime = Date.now();

  const inputData = await readFile(inputPath, 'utf-8');
  const entries: InputEntry[] = JSON.parse(inputData);
  const tree = buildTree(entries);

  if (!tree) {
    console.error('Failed to build tree');
    return;
  }

  const output = JSON.stringify(tree, null, 2);
  await writeFile(outputPath, output, 'utf-8');

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`Tree built in ${duration}ms`);
  console.log(`Output written to ${outputPath}`);
}

if (require.main === module) {
  main().catch(console.error);
}
