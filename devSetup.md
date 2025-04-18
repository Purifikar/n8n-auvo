---

## 🔧 Installation & Setup Guide (n8n + Custom Nodes + SQLite)

### 1. Install Prerequisites

#### ✅ Install NVM (Node Version Manager)
Follow official instructions: https://github.com/nvm-sh/nvm

#### ✅ Install Node.js
> ⚠️ n8n **does not support Node.js versions above 22** (as of 2025)



```bash
nvm install 20
nvm use 20
nvm alias default 20
```

### 2. Install Global Dependencies

```bash
# Optional: Try installing globally (may work depending on environment)
pnpm add -g sqlite3
pnpm add -g n8n
pnpm approve-builds # 
```

### 3. Setup Custom Node Environment

```bash
# Create custom folder if it doesn't exist
mkdir -p ~/.n8n/custom
cd ~/.n8n/custom
pnpm init # initialize folder
``` 

On node module repository folder

```bash
# Clean old builds and dependencies (optional but recommended)
rm -rf dist node_modules
# Install dependencies and build
pnpm install
pnpm run build
```

### 4. Link Your Custom Node to n8n

```bash
cd ~/.n8n/custom
pnpm link /full/path/to/your-node-project
```

### 5. Running n8n and Fixing SQLite Issues 

#### Option A: custom folder install (preferred if global fails)

On the custom node folder

```bash
pnpm add sqlite3
pnpm approve-builds  # 🧠 This step is crucial for build approval!
n8n start
```

#### Option B: Inside your node project (as a fallback)

```bash
cd /path/to/your-node-project
pnpm add sqlite3
pnpm approve-builds  # ✅ Don't skip this! PROBABLY THE ONLY REAL PROBLEM!
n8n start
```

### 6. Start n8n

```bash
n8n start
```

## 🚀 Deployment Instructions

1. Create a `.tgz` package from your custom node:
   ```bash
   npm pack
   ```

2. Upload the `.tgz` file to the `n8n_data` volume using **Portainer**.

3. Access the `n8n` container as **root**, then run:
   ```bash
   npm install your-package.tgz
   ```

4. Restart the n8n stack/service.


>### ~~Testing issues~~ 
> 
~~`pnpm run test`~~
> ~~For tests, somehow the building scripts (that are prompt to fail and sometimes try to guess things) 
don't see that package (module) `workflow-n8n` uses 'dist' and not 'src' folder inside the `node_modules` folder. 
That's why I included the bellow on the `tsconfig.json` to force it read at correct dist path.~~
~~`"paths": {
      "n8n-workflow": ["./node_modules/n8n-workflow/dist"]
    },
`~~
~~

### Notes

**Dammit!!**
**Not according to n8n starter node settings** (package.json and tsconfig.json) 
- 1. package.json
  - Don't use `tsup`! Use `tsc` compiler
  - Never set `"type": "module"`
- 2. tsconfig.json
  - Don't use `ts-node` config