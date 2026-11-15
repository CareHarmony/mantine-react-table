import { SourceCodeSnippet } from '../../components/mdx/SourceCodeSnippet';
import dynamic from 'next/dynamic';

//the example reads browser-only state in a useState initializer, so the docs render it in the browser only
const Example = dynamic(() => import('./sandbox/src/TS'), { ssr: false });

const TS = require('!!raw-loader!./sandbox/src/TS.tsx').default;

const ExampleTable = () => {
  return (
    <SourceCodeSnippet
      Component={Example}
      typeScriptCode={TS}
      tableId="persistent-state"
    />
  );
};

export default ExampleTable;
