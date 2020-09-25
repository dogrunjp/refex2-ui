<gene_info>
    <div class="modal fade" id="geneinfo" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-body" show={display}>
<div class='panel-heading'><h1><a href="https://www.ncbi.nlm.nih.gov/gene/?term={info.entrezgene}" target="_blank" rel="noopener"> {info.symbol} ( {info.name}, NCBI_GeneID: {info.entrezgene} )</a></h1></div>
                    <h2>Alias</h2>
                    <div class="panel-body box_container">
                        <li if={Array.isArray(info.alias)} each={name in info.alias}>{ name }</li>
                        <div if={!Array.isArray(info.alias)}>{info.alias}</div>
                    </div>
                    <h2>Type of gene</h2>
                    <div class="panel-body">{info.type_of_gene}</div>
                    <h2>Summary</h2>
                    <div class="panel-body">{info.summary}</div>
                    <h2>RefSeq</h2>
                    <div class="panel-body box_container">
                        <li if={Array.isArray(info.refseq.rna)} each={name in info.refseq.rna}><a href="https://www.ncbi.nlm.nih.gov/gene/?term={name}" target="_blank" rel="noopener">{ name }</a></li>
                        <div if={!Array.isArray(info.refseq.rna)}><a href="https://www.ncbi.nlm.nih.gov/gene/?term={info.refseq.rna}">{info.refseq.rna}</a></div>
                    </div>
                    <h2>Ensembl</h2>
                    <div class="panel-body box_container">
                        <li if={Array.isArray(info.ensembl.transcript)} each={name in info.ensembl.transcript}><a href="http://asia.ensembl.org/Multi/Search/Results?q={name};site=enssembl" target="_blank" rel="noopener"> { name }</a></li>
                        <div if={!Array.isArray(info.ensembl.transcript)}><a href="http://asia.ensembl.org/Multi/Search/Results?q={info.ensembl.transcript};site=enssembl" target="_blank" rel="noopener">{info.ensembl.transcript}</a></div>
                    </div>

                    <h2>GO</h2>
                    <h3>BP</h3>
                    <div class="panel-body box_container">
                        <li each={ontology in info.go.BP}><a href="http://amigo.geneontology.org/amigo/term/{ontology.id}" target="_blank" rel="noopener"> {ontology.id}: { ontology.term }</a></li>
                    </div>
                    <h3>CC</h3>
                    <div class="panel-body box_container">
                        <li each={ontology in info.go.CC}><a href="http://amigo.geneontology.org/amigo/term/{ontology.id}" target="_blank" rel="noopener">{ontology.id}: { ontology.term }</a></li>
                    </div>
                    <h3>MF</h3>
                    <div class="panel-body box_container">
                        <li each={ontology in info.go.MF}><a href="http://amigo.geneontology.org/amigo/term/{ontology.id}" target="_blank" rel="noopener">{ontology.id}: { ontology.term }</a></li>
                    </div>

                </div>
            </div>
        </div>
    </div>
    <script>
        var self = this;
        //空のオブジェクトを最初に読み込ませる
        self.info = {"_id": "", "alias": [], "ensembl": [], "entrezgene":"", "go": [], "refseq": {"rna": []},
            "name": "", "summary":"", "symbol": "", "taxid": ""};
        obs.on("showmygene",function (jsn) {
            self.info = jsn;
            self.display = true;
            self.update()

        });
        self.display = true;


    </script>
</gene_info>