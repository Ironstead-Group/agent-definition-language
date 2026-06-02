export default {
  id: "fixture-formatter",
  label: "Fixture Formatter",
  outputLanguage: "text",
  render(ir: { identity: { name: string } }) {
    return [
      {
        path: "agent.txt",
        content: `Generated fixture for ${ir.identity.name}\n`,
      },
    ];
  },
};
