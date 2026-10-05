interface ScoreProps {
  score: number;
}

export const ScoreIndicator = ({ score }: ScoreProps) => {
  const getColor = () => {
    if (score >= 80) return 'text-evo-green border-evo-green';
    if (score >= 60) return 'text-evo-accent border-evo-accent';
    if (score >= 40) return 'text-yellow-500 border-yellow-500';
    return 'text-evo-red border-evo-red';
  };

  return (
    <div className="flex flex-col items-center justify-center" role="img" aria-label={`Pontuação ilustrativa: ${score} de 100`}>
      <div className={`w-14 h-14 rounded-full border-[3px] flex items-center justify-center font-bold text-lg ${getColor()}`}>
        {score}
      </div>
      <span className="text-evo-textSec text-[10px] mt-1 font-medium uppercase tracking-wider">Score</span>
    </div>
  );
};
