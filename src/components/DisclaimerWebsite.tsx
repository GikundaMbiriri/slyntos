import React from 'react';

const DisclaimerWebsite: React.FC = () => {
  return (
    <div className="bg-purple-900/50 border border-purple-700 text-purple-300 px-4 py-3 rounded-lg relative mb-4 text-sm" role="alert">
      <strong className="font-bold">Beta Feature: </strong>
      <span className="block sm:inline">
        The Website Creator is an experimental tool. The generated code is a starting point and may require manual adjustments to be fully functional and secure. Always review the output.
      </span>
    </div>
  );
};

export default DisclaimerWebsite;
