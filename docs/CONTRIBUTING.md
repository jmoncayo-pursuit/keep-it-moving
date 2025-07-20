# Contributing to KIM 🤝

Welcome to the Keep-It-Moving (KIM) community! We're excited to have you contribute to this joyful, local-first coding experience. 

## #ForTheLoveOfCode Spirit 💝

KIM was born from the hackathon spirit of "For the Love of Code 2025" - we believe in:

- **Joyful Development**: Code should be fun! Use emoji, write playful comments, and keep things light
- **Local-First**: Privacy and speed through local-only solutions
- **Developer Experience**: Build tools that developers actually want to use
- **Community Driven**: Everyone's ideas make KIM better

## Quick Start for Contributors 🚀

### 1. Fork and Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR-USERNAME/keep-it-moving.git
cd keep-it-moving
```

### 2. Setup Development Environment

```bash
# Install all dependencies
npm run setup

# Start development environment
npm run dev

# Run tests to make sure everything works
npm test
```

### 3. Make Your Changes

```bash
# Create a feature branch
git checkout -b feature/amazing-new-feature

# Make your changes with tests
# ... code, code, code ...

# Test your changes
npm test

# Commit with emoji! 
git commit -m "✨ Add amazing new feature with extra sparkle"
```

### 4. Submit a Pull Request

1. Push your branch: `git push origin feature/amazing-new-feature`
2. Open a PR on GitHub
3. Fill out the PR template with emoji and enthusiasm! 🎉

## Development Guidelines 📋

### Code Style 🎨

#### Emoji Usage
We love emoji in KIM! Use them in:
- **Commit messages**: `🐛 Fix connection bug`, `✨ Add new feature`
- **Comments**: `// 🚀 Launch the server with style!`
- **User-facing messages**: `"🎉 Successfully paired with VS Code!"`
- **Documentation**: Make it fun and engaging!

#### JavaScript/TypeScript Style
```javascript
// ✅ Good: Descriptive names with emoji comments
function connectToServer() {
    console.log('🔗 Connecting to KIM server...');
    // 🎯 Implementation here
}

// ❌ Avoid: Boring comments
function connectToServer() {
    console.log('Connecting to server');
    // Implementation here
}
```

#### React Component Style
```jsx
// ✅ Good: Joyful and functional
function PairingScreen({ onPair, isConnecting }) {
    return (
        <div className="kim-card">
            <h2>
                <span className="emoji">🔗</span> Pair Device
            </h2>
            {/* 🎨 Beautiful UI components */}
        </div>
    );
}
```

### Testing Philosophy 🧪

Every feature should have tests that are:
- **Comprehensive**: Cover happy path and edge cases
- **Fast**: Run quickly in CI/CD
- **Reliable**: Don't flake or depend on external services
- **Readable**: Other developers can understand them

```javascript
// ✅ Good test with emoji and clear intent
test('🚀 should send prompt successfully with emoji feedback', async () => {
    const mockOnSend = jest.fn();
    render(<PromptScreen onSendPrompt={mockOnSend} />);
    
    // 🎯 User sends a prompt
    fireEvent.change(screen.getByPlaceholderText(/Type your prompt/), {
        target: { value: 'Explain this function' }
    });
    fireEvent.click(screen.getByText('🚀 Send to Copilot'));
    
    // ✅ Should call handler with correct prompt
    expect(mockOnSend).toHaveBeenCalledWith('Explain this function');
});
```

### Architecture Principles 🏗️

#### Local-First
- No external API calls
- All data stays on local network
- Graceful offline handling

#### Joyful UX
- Emoji-driven feedback
- Playful error messages
- Smooth animations and transitions

#### Performance
- < 2 second response times
- 95% success rate on local network
- Minimal resource usage

## Component-Specific Guidelines 📦

### Server (`server/`) 🖥️

The WebSocket relay server is the heart of KIM:

```javascript
// ✅ Good: Playful error messages
this.sendError(ws, 'Code took a coffee break! ☕', '☕');

// ✅ Good: Emoji status indicators
console.log('🚀 KIM Server starting up...');
console.log('🎉 Server running on port', this.port);
```

**Key areas for contribution:**
- Performance optimizations
- New message types
- Better error handling
- Security improvements

### PWA (`pwa/`) 📱

The Progressive Web App provides the mobile interface:

```jsx
// ✅ Good: Responsive design with emoji
<button className="kim-button">
    <span className="emoji">🚀</span> Send to Copilot
</button>
```

**Key areas for contribution:**
- Mobile UX improvements
- New prompt features
- Accessibility enhancements
- Performance optimizations

### VS Code Extension (`extension/`) 🔧

The extension integrates with GitHub Copilot:

```javascript
// ✅ Good: Helpful status messages
vscode.window.showInformationMessage('🎉 KIM is ready to relay your prompts!');
```

**Key areas for contribution:**
- Better Copilot integration
- Status bar improvements
- Command palette features
- Settings and configuration

### CLI (`cli/`) ⌨️

The command-line interface for server management:

```javascript
// ✅ Good: Helpful CLI output
console.log('🚀 Starting KIM relay server...');
console.log('📡 Server running on port', options.port);
```

**Key areas for contribution:**
- New CLI commands
- Better error handling
- Cross-platform improvements
- Installation scripts

## Types of Contributions 🎯

### 🐛 Bug Fixes
- Fix connection issues
- Resolve pairing problems
- Improve error handling
- Performance improvements

### ✨ New Features
- Voice prompt support
- Team collaboration features
- New device integrations
- Enhanced UI components

### 📚 Documentation
- Setup guides
- API documentation
- Video tutorials
- Blog posts

### 🧪 Testing
- Unit test coverage
- Integration tests
- Performance benchmarks
- Cross-platform testing

### 🎨 Design
- UI/UX improvements
- Icon and emoji design
- Animation enhancements
- Accessibility features

## Contribution Workflow 🔄

### 1. Issue First (For Big Changes)
For major features or changes:
1. Open an issue to discuss the idea
2. Get feedback from maintainers
3. Create a design document if needed
4. Start implementation

### 2. Small Changes Welcome
For small improvements:
- Fix typos
- Improve error messages
- Add emoji to existing features
- Update documentation

### 3. Pull Request Process

#### PR Title Format
Use emoji and be descriptive:
- `🐛 Fix WebSocket connection timeout`
- `✨ Add voice prompt support`
- `📚 Update setup documentation`
- `🎨 Improve mobile UI animations`

#### PR Description Template
```markdown
## What does this PR do? 🤔

Brief description of the changes.

## How to test 🧪

Steps to test the changes:
1. Start the server
2. Do something specific
3. Verify the result

## Screenshots/GIFs 📸

If UI changes, include visuals!

## Checklist ✅

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Emoji added where appropriate 😄
- [ ] Follows code style guidelines
- [ ] No breaking changes (or clearly documented)
```

### 4. Code Review Process

All PRs need:
- ✅ Automated tests passing
- ✅ Code review from maintainer
- ✅ No merge conflicts
- ✅ Documentation updated if needed

## Development Environment 🛠️

### Recommended Tools
- **VS Code** with KIM extension (dogfooding!)
- **Node.js 16+** for all components
- **Chrome DevTools** for PWA debugging
- **React DevTools** for component debugging

### Useful Commands
```bash
# Start everything in development mode
npm run dev

# Run specific component tests
cd server && npm test
cd pwa && npm test
cd extension && npm test

# Build everything
npm run build

# Health check
kim doctor

# Performance tests
npm run test:performance
```

### Debugging Tips 🔍

#### Server Debugging
```bash
# Verbose logging
kim start --verbose

# Debug WebSocket connections
DEBUG=ws node server/index.js
```

#### PWA Debugging
```bash
# Development server with hot reload
cd pwa && npm run dev

# Build and preview
npm run build && npm run preview
```

#### Extension Debugging
1. Open extension folder in VS Code
2. Press F5 to launch Extension Development Host
3. Use Developer Tools for debugging

## Community Guidelines 🌟

### Be Welcoming 🤗
- Help newcomers get started
- Answer questions patiently
- Share knowledge generously
- Celebrate others' contributions

### Stay Positive 😊
- Use constructive feedback
- Focus on solutions, not problems
- Keep discussions respectful
- Remember we're all learning

### Have Fun! 🎉
- Use emoji liberally
- Write playful commit messages
- Celebrate milestones
- Share your KIM success stories

## Recognition 🏆

Contributors are recognized in:
- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub Discussions** shout-outs
- **Social media** mentions (with permission)

## Getting Help 🆘

### Stuck on Something?
1. Check existing [Issues](https://github.com/your-username/keep-it-moving/issues)
2. Ask in [Discussions](https://github.com/your-username/keep-it-moving/discussions)
3. Join our community chat (link in README)
4. Tag maintainers in your PR/issue

### Maintainer Response Times
We aim to respond to:
- **Issues**: Within 48 hours
- **PRs**: Within 72 hours
- **Security issues**: Within 24 hours

## Release Process 🚀

### Versioning
We use semantic versioning:
- **Major** (1.0.0): Breaking changes
- **Minor** (1.1.0): New features
- **Patch** (1.1.1): Bug fixes

### Release Schedule
- **Patch releases**: As needed for bugs
- **Minor releases**: Monthly for new features
- **Major releases**: When significant changes accumulate

## Code of Conduct 📜

### Our Pledge
We pledge to make participation in KIM a harassment-free experience for everyone, regardless of:
- Age, body size, disability, ethnicity
- Gender identity and expression
- Level of experience, nationality
- Personal appearance, race, religion
- Sexual identity and orientation

### Our Standards ✨
**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Trolling, insulting/derogatory comments, personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement 🛡️
Report unacceptable behavior to the maintainers. All complaints will be reviewed and investigated promptly and fairly.

---

## Thank You! 🙏

Every contribution makes KIM better for the entire developer community. Whether you're fixing a typo, adding a feature, or just spreading the word - **thank you for keeping it moving!** 🚀

---

<div align="center">

**#ForTheLoveOfCode 2025** 💝

*Built with ❤️ and lots of ☕ by the KIM community*

</div>