const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');

async function createMockModel() {
    console.log("Generating Mock CNN Model with random weights...");
    
    // 1. Create a small mock CNN model
    const model = tf.sequential();
    
    // Simplistic architecture that takes 28x28x1 but calculates instantly
    model.add(tf.layers.conv2d({inputShape: [28, 28, 1], filters: 2, kernelSize: 3, activation: 'relu'}));
    model.add(tf.layers.flatten());
    // Output 10 classes (digits 0-9)
    model.add(tf.layers.dense({units: 10, activation: 'softmax', kernelInitializer: 'randomUniform'}));
    
    model.compile({optimizer: 'adam', loss: 'categoricalCrossentropy'});

    // 2. Export it as a TensorFlow.js model without needing @tensorflow/tfjs-node
    let modelJson = {};
    let weightsBuffer = null;

    await model.save(tf.io.withSaveHandler(async (artifacts) => {
        modelJson = {
            format: 'layers-model',
            generatedBy: 'TensorFlow.js tfjs',
            convertedBy: null,
            modelTopology: artifacts.modelTopology,
            weightsManifest: [{
                paths: ['group1-shard1of1.bin'],
                weights: artifacts.weightSpecs,
            }]
        };
        weightsBuffer = Buffer.from(artifacts.weightData);
        return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
    }));

    // Save to the client public directory
    const outDir = path.join(__dirname, 'public', 'models', 'mock-cnn');
    fs.mkdirSync(outDir, {recursive: true});
    fs.writeFileSync(path.join(outDir, 'model.json'), JSON.stringify(modelJson, null, 2));
    fs.writeFileSync(path.join(outDir, 'group1-shard1of1.bin'), weightsBuffer);
    
    console.log(`✅ Lightweight mock mode saved successfully!`);
    console.log(`📂 Location: ${outDir}`);
    console.log(`It can now be loaded via tf.loadLayersModel('/models/mock-cnn/model.json')\n`);
}

createMockModel();
