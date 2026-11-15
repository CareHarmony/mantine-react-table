import { SourceCodeSnippet } from '../../components/mdx/SourceCodeSnippet';
import dynamic from 'next/dynamic';

//the example reads browser-only state in a useState initializer, so the docs render it in the browser only
const Example = dynamic(() => import('./sandbox/src/TS'), { ssr: false });

const TS = require('!!raw-loader!./sandbox/src/TS.tsx').default;
const Legacy = require('!!raw-loader!./sandbox/src/Legacy.tsx').default;

const ExampleTable = () => {
  return (
    <SourceCodeSnippet
      Component={Example}
      legacyCode={Legacy}
      typeScriptCode={TS}
      tableId="virtualized"
    />
  );
};

export default ExampleTable;
