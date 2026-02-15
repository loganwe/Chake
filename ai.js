// Activation functions
function relu(x) {
    return x.map(val => Math.max(0, val));
  }

  function reluDerivative(x) {
    return x.map(val => (val > 0 ? 1 : 0));
  }

  function tanh(x) {
    return x.map(val => Math.tanh(val));
  }

  function tanhDerivative(x) {
    return x.map(val => 1 - Math.pow(Math.tanh(val), 2));
  }

  // Normalize function (avoid division by zero)
  function normalize(data) {
    return data.map((row) => {
      const maxAbs = Math.max(...row.map(Math.abs));
      return maxAbs === 0 ? row.map(() => 0) : row.map(val => val / maxAbs);
    });
  }

  // Dummy training data (normalized)
  let playerMoves = [
    [1, 0, -70], [0, 1, -50], [-1, 0, 30], [0, -1, 20],
    [0, -1, 0], [-1, 0, -1], [0, -1, 0], [-1, 0, -1],
    [0, -1, 0], [-1, 0, -1], [0, 1, 0], [1, 0, 1],
    [0, 1, 0], [1, 0, 1], [0, 1, 0], [1, 0, 1]
  ];

  playerMoves = normalize(playerMoves);

  let X_train = playerMoves.map(row => row.slice(0, 2)); // Inputs (directional moves)
  let y_train = playerMoves.map(row => row.slice(2));   // Outputs (X, Y positions)

  // Neural network architecture
  const inputSize = 2;
  const hiddenSize = 50;
  const outputSize = 2;
  const learningRate = 0.01;

  // Xavier initialization
  function xavierInit(rows, cols) {
    let scale = Math.sqrt(2 / (rows + cols));
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale));
  }

  // Initialize weights and biases
  let weightsInputHidden = xavierInit(inputSize, hiddenSize);
  let biasHidden = Array(hiddenSize).fill(0);
  let weightsHiddenOutput = xavierInit(hiddenSize, outputSize);
  let biasOutput = Array(outputSize).fill(0);

  // Matrix multiplication
  function matrixMultiply(A, B) {
    return A.map(row =>
      B[0].map((_, colIndex) =>
        row.reduce((sum, val, rowIndex) => sum + val * B[rowIndex][colIndex], 0)
      )
    );
  }

  // Clip gradients to prevent NaN issues
  function clipGradient(grad, limit = 1.0) {
    return grad.map(row => row.map(val => Math.max(-limit, Math.min(limit, val))));
  }

  // Training loop
  const epochs = 1000;
  let outputLayerOutput;
  async function train() {
    for (let epoch = 0; epoch < epochs; epoch++) {
      // Forward pass
      let hiddenLayerInput = matrixMultiply(X_train, weightsInputHidden);
      hiddenLayerInput = hiddenLayerInput.map((row, i) => row.map((val, j) => val + biasHidden[j]));
      let hiddenLayerOutput = hiddenLayerInput.map(relu);

      let outputLayerInput = matrixMultiply(hiddenLayerOutput, weightsHiddenOutput);
      outputLayerInput = outputLayerInput.map((row, i) => row.map((val, j) => val + biasOutput[j]));
      outputLayerOutput = outputLayerInput.map(tanh);

      // Compute loss (Mean Squared Error)
      let loss = outputLayerOutput.reduce((sum, row, i) =>
        sum + row.reduce((sum2, val, j) => sum2 + Math.pow(val - y_train[i][j], 2), 0), 0
      ) / y_train.length;

      if (isNaN(loss)) {
        console.error("NaN detected in loss! Stopping training.");
        break;
      }

      // Backpropagation
      let error = outputLayerOutput.map((row, i) => row.map((val, j) => val - y_train[i][j]));
      let dOutput = outputLayerInput.map((row, i) => row.map((val, j) => error[i][j] * tanhDerivative([val])[0]));

      let dHidden = hiddenLayerInput.map((row, i) =>
        row.map((val, j) =>
          dOutput[i].reduce((sum, d, k) => sum + d * weightsHiddenOutput[j][k], 0) * reluDerivative([val])[0]
        )
      );

      // Clip gradients to avoid NaN errors
      dOutput = clipGradient(dOutput);
      dHidden = clipGradient(dHidden);

      // Update weights and biases
      weightsHiddenOutput = weightsHiddenOutput.map((row, j) =>
        row.map((val, k) => val - learningRate * hiddenLayerOutput.reduce((sum, h, i) => sum + h[j] * dOutput[i][k], 0))
      );

      biasOutput = biasOutput.map((val, j) => val - learningRate * dOutput.reduce((sum, row) => sum + row[j], 0));

      weightsInputHidden = weightsInputHidden.map((row, j) =>
        row.map((val, k) => val - learningRate * X_train.reduce((sum, x, i) => sum + x[j] * dHidden[i][k], 0))
      );

      biasHidden = biasHidden.map((val, j) => val - learningRate * dHidden.reduce((sum, row) => sum + row[j], 0));

      if (epoch % 100 === 0) {
        console.log(`Epoch ${epoch}, Loss: ${loss.toFixed(4)}`);
      }
    }
  }
  // Round output function
  function roundOutput(output) {
    return output.map(row => {
      let xOutput = Math.abs(row[0]) < Math.abs(row[1]) ? 0 : Math.sign(row[0]);
      let yOutput = Math.abs(row[1]) < Math.abs(row[0]) ? 0 : Math.sign(row[1]);
      return [xOutput, yOutput];
    });
  }