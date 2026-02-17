import React, {type ComponentProps} from 'react';
import MDXComponents from '@theme-original/MDXComponents';

function ResponsiveTable(props: ComponentProps<'table'>) {
  return (
    <div className="table-wrapper">
      <table {...props} />
    </div>
  );
}

export default {
  ...MDXComponents,
  table: ResponsiveTable,
};
