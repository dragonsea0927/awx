import React, { useState } from 'react';
import { number, bool } from 'prop-types';
import styled from 'styled-components';
import Chip from './Chip';

const ChipGroup = ({ children, className, showOverflowAfter, displayAll, ...props }) => {
  const [isExpanded, setIsExpanded] = useState(!showOverflowAfter);
  const toggleIsOpen = () => setIsExpanded(!isExpanded);

  const mappedChildren = React.Children.map(children, c => (
    React.cloneElement(c, { component: 'li' })
  ));
  const showOverflowToggle = showOverflowAfter && children.length > showOverflowAfter;
  const numToShow = isExpanded
    ? children.length
    : Math.min(showOverflowAfter, children.length);
  const expandedText = 'Show Less';
  const collapsedText = `${children.length - showOverflowAfter} more`;

  return (
    <ul className={`pf-c-chip-group ${className}`} {...props}>
      {displayAll ? mappedChildren : mappedChildren.slice(0, numToShow)}
      {!displayAll && showOverflowToggle && (
        <Chip isOverflowChip onClick={toggleIsOpen} component="li">
          {isExpanded ? expandedText : collapsedText}
        </Chip>
      )}
    </ul>
  );
};
ChipGroup.propTypes = {
  showOverflowAfter: number,
  displayAll: bool
};
ChipGroup.defaultProps = {
  showOverflowAfter: null,
  displayAll: false
};

export default styled(ChipGroup)`
  --pf-c-chip-group--c-chip--MarginRight: 10px;
  --pf-c-chip-group--c-chip--MarginBottom: 10px;
  
  > .pf-c-chip.pf-m-overflow button {
    padding: 3px 8px;
  }
`;
